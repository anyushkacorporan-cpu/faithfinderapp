/**
 * Four Circle — the welcome email for the launch list.
 *
 * Runs on Supabase because it holds the Resend API key, and anything the
 * public page holds can be read out of the public page.
 *
 * The page saves the address itself, by calling join_waitlist directly, and
 * then calls this separately and ignores what it says. That split is
 * deliberate: the address being saved is the part that cannot be recovered
 * later, so it must not depend on this function existing, being deployed, or
 * Resend being up. If this is missing entirely the form still works and the
 * list still fills; what is lost is an email, which can be sent later.
 *
 * WHAT STOPS THIS BEING A WAY TO EMAIL STRANGERS
 *
 * Nothing here decides who gets mail. claim_welcome() does, in the database:
 * it returns true once per address and only for an address already on the
 * list (28_waitlist_welcome.sql). So an address that was never typed into the
 * form gets nothing, and an address that was gets exactly one email in its
 * lifetime no matter how many times this endpoint is hit.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

/**
 * The key that gets past row-level security, under either name.
 *
 * SUPABASE_SERVICE_ROLE_KEY is the one every example still uses and the
 * dashboard now marks deprecated: projects issuing keys through JWT signing
 * get SUPABASE_SECRET_KEYS instead, a JSON dictionary, and the old variable
 * can be empty. Empty is the worst case to debug, because the client builds
 * fine, the request goes out unauthenticated, claim_welcome refuses it, and
 * the function returns its usual cheerful 200 having sent nothing.
 *
 * So: the old name if it has anything in it, otherwise the first string in
 * the new dictionary. Reading values rather than a named field on purpose,
 * because the field names in that dictionary are not ours to assume.
 */
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    const found = Object.values(parsed).find(v => typeof v === 'string' && v);
    return typeof found === 'string' ? found : '';
  } catch {
    return '';
  }
}

const SERVICE_KEY = serviceKey();

const FROM = 'Four Circle <hello@fourcircle.app>';
const REPLY_TO = 'support@fourcircle.app';
const SUBJECT = "You're on the list";

/**
 * One click, and they are off.
 *
 * This was a mailto, which opened a half written message the reader then had
 * to send and somebody then had to act on by hand. It asked for effort at the
 * moment a person had decided they wanted less to do with us, and the easier
 * button beside it is the one marked spam, which costs the domain far more
 * than one subscriber does.
 *
 * The token in the link is a random uuid belonging to that row, handed out
 * only inside the email sent to that address (29_waitlist_unsubscribe.sql).
 * A link carrying the address instead would be a link anybody could type.
 */
function unsubscribeUrl(token: string) {
  return `https://fourcircle.app/unsubscribe.html?t=${encodeURIComponent(token)}`;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Always 200, always the same body.
 *
 * The caller is a public web page and the only honest thing to tell it is
 * that the request arrived. Whether an email went out depends on whether this
 * address had already had one, which is a fact about the list, and the list
 * does not answer questions from strangers (27_waitlist.sql says the same
 * thing about join_waitlist).
 */
function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Plain text first. Some people read it, and every spam filter does. */
const TEXT = (url: string) => `You're on the list.

Thank you for being here before it begins. Four Circle comes to the App Store
soon, and we will write to you the day it opens.

It was built for you. We created something special where you can find a church
to call home, worship wherever you travel, and join exciting faith-based events
near you. But most importantly, it is where you will find people who want to
grow and encourage one another to draw closer to Christ.

Until then, we will keep you updated.

From Four Circle

Instagram: @fourcircle.app
https://instagram.com/fourcircle.app

We only write about Four Circle. If you would rather we did not, open this link
and you are off the list straight away:
${url}`;

/**
 * Deliberately plain HTML. Inline styles, one column, no images and no web
 * fonts: an email is read in two dozen clients that each disagree about CSS,
 * and the ones that disagree least are the ones asked to do least.
 *
 * ABOUT DARK MODE
 *
 * The cream version of this arrived looking black, because Gmail in dark mode
 * inverts a light email rather than asking. color-scheme and
 * supported-color-schemes are how a message says it was designed for light
 * and would rather be left alone; Apple Mail honours that and Gmail usually
 * does. Some clients invert regardless and there is no header that stops
 * them, so this is written to survive it: plain white, real contrast, and no
 * thin decorative lines that disappear when the colours flip.
 */
const HTML = (url: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>:root { color-scheme: light; supported-color-schemes: light; }</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;color-scheme:light;">
  <div style="max-width:480px;margin:0 auto;padding:36px 26px;background:#ffffff;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;font-size:16px;line-height:1.6;">
    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a98c54;font-weight:700;">Four Circle</div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:26px;line-height:1.25;margin:16px 0 20px;color:#1a1a2e;">You're on the list.</h1>
    <p style="margin:0 0 16px;color:#3c3c48;">Thank you for being here before it begins. Four Circle comes to the App Store soon, and we will write to you the day it opens.</p>
    <p style="margin:0 0 24px;color:#3c3c48;">It was built for you. We created something special where you can find a church to call home, worship wherever you travel, and join exciting faith-based events near you. But most importantly, it is where you will find people who want to grow and encourage one another to draw closer to Christ.</p>
    <p style="margin:0 0 24px;color:#3c3c48;">Until then, we will keep you updated.</p>
    <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:15px;color:#a98c54;">From Four Circle</p>
    <p style="margin:28px 0 0;font-size:15px;">
      <a href="https://instagram.com/fourcircle.app" style="color:#a98c54;font-weight:600;text-decoration:none;"><img src="https://fourcircle.app/instagram.png" width="22" height="22" alt="Instagram" style="vertical-align:middle;border:0;">&nbsp;&nbsp;@fourcircle.app</a>
    </p>
    <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#71717c;">
      We only write about Four Circle. If you would rather we did not,
      <a href="${url}" style="color:#71717c;">unsubscribe</a>.
    </p>
  </div>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!SERVICE_KEY) console.error('no service key: set SUPABASE_SECRET_KEYS or SUPABASE_SERVICE_ROLE_KEY');
    if (!RESEND_KEY) console.error('no RESEND_API_KEY');

    const { email } = await req.json().catch(() => ({ email: '' }));
    const address = String(email ?? '').trim().toLowerCase();
    if (!address) return ok();

    // The database decides, not this function. False means either the address
    // is not on the list or it has had its one email already; both are
    // reasons to do nothing, and neither is worth telling the caller apart.
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: claimed, error } = await db.rpc('claim_welcome', { p_email: address });
    if (error || claimed !== true) return ok();

    // After the claim, so a row that was never going to be written to is not
    // asked about either. No token means no way off the list, and an email
    // nobody can leave is worse than no email, so this one does not go.
    const { data: token } = await db.rpc('waitlist_token', { p_email: address });
    if (!token) {
      console.error('no unsubscribe token for a claimed address');
      return ok();
    }
    const url = unsubscribeUrl(String(token));

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [address],
        reply_to: REPLY_TO,
        subject: SUBJECT,
        text: TEXT(url),
        html: HTML(url),
        // What draws the Unsubscribe button Gmail and Apple Mail put at the
        // top of a message, above anything we control. Worth more than the
        // footer link, because it is the one most people actually use, and a
        // list with a visible way off it is a list that gets marked as spam
        // less often.
        // The button Gmail and Apple Mail draw above anything we control.
        //
        // Deliberately without List-Unsubscribe-Post. That header promises the
        // url answers a POST and lets the mail client unsubscribe without
        // opening anything, which is nicer, and which this url cannot do:
        // GitHub Pages serves files and answers GET. Claiming otherwise means
        // the client posts, gets a refusal, and tells the person the
        // unsubscribe failed when in fact it was never tried. Without it the
        // button opens the page, which removes them and says so.
        headers: { 'List-Unsubscribe': `<${url}>` },
      }),
    });

    // The claim is already spent at this point, so a refusal from Resend
    // costs this person their welcome email. Logged rather than retried: a
    // retry loop inside a request that nobody is waiting on is a good way to
    // send two, and the launch email is the one that actually matters.
    if (!res.ok) {
      console.error('resend refused', res.status, await res.text());
    }
    return ok();
  } catch (e) {
    console.error('waitlist-welcome', e);
    return ok();
  }
});

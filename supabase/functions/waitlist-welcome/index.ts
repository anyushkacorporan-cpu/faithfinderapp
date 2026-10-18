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
 * Where an unsubscribe goes.
 *
 * A mailto rather than a link to a page, because a page needs an endpoint
 * that can remove somebody, and an endpoint that removes somebody on request
 * needs a signed token or it is a way for a stranger to unsubscribe anyone
 * whose address they can guess. That is a real thing to build and this list
 * is small, so for now the address does the job: it is a working opt-out,
 * which is what the law asks for, and it lands in the same inbox as
 * everything else.
 *
 * It also goes in a List-Unsubscribe header, which is what makes Gmail and
 * Apple Mail draw their own Unsubscribe button at the top of the message.
 * Most people use that and never read the footer.
 */
const UNSUBSCRIBE = 'support@fourcircle.app';

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
const TEXT = `You're on the list.

Four Circle is coming to the App Store, and you will be among the first to
know. We will email you the day it opens, so you can create your account
before anybody else.

Until then, God bless you.

From the Four Circle app

You are getting this because you asked to be told when Four Circle opens.
To stop receiving them, email ${UNSUBSCRIBE} with "unsubscribe" as the
subject and you will be taken off the list.`;

/**
 * Deliberately plain HTML. Inline styles, one column, no images and no web
 * fonts: an email is read in two dozen clients that each disagree about CSS,
 * and the ones that disagree least are the ones asked to do least. The gold
 * rule and the serif are the only things carried over from the site.
 */
const HTML = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf9f6;">
  <div style="max-width:480px;margin:0 auto;background:#fffdfa;border:1px solid #e9e5dd;border-radius:14px;padding:32px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;font-size:16px;line-height:1.6;">
    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a98c54;font-weight:700;">Four Circle</div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:26px;line-height:1.2;margin:14px 0 0;">You're on the list.</h1>
    <div style="width:56px;height:2px;background:#c9a96e;margin:18px 0 20px;"></div>
    <p style="margin:0 0 16px;color:#4a4a56;">Four Circle is coming to the App Store, and you will be among the first to know. We will email you the day it opens, so you can create your account before anybody else.</p>
    <p style="margin:0 0 24px;color:#4a4a56;">Until then, God bless you.</p>
    <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:15px;color:#a98c54;">From the Four Circle app</p>
    <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e9e5dd;font-size:12px;color:#8a8a94;">
      You are getting this because you asked to be told when Four Circle opens.
      <a href="mailto:${UNSUBSCRIBE}?subject=unsubscribe" style="color:#8a8a94;">Unsubscribe</a>.
    </p>
  </div>
</body></html>`;

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
        text: TEXT,
        html: HTML,
        // What draws the Unsubscribe button Gmail and Apple Mail put at the
        // top of a message, above anything we control. Worth more than the
        // footer link, because it is the one most people actually use, and a
        // list with a visible way off it is a list that gets marked as spam
        // less often.
        headers: { 'List-Unsubscribe': `<mailto:${UNSUBSCRIBE}?subject=unsubscribe>` },
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

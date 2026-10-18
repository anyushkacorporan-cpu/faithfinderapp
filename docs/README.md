# The public pages

Served from this folder by GitHub Pages, free, from a public repository. Turn
it on at Settings → Pages → Source: deploy from a branch → main → /docs, then
put `fourcircle.app` in the custom domain box and tick Enforce HTTPS.

`CNAME` is what makes the domain stick. It holds one line, the bare domain with
no scheme and no trailing slash, and GitHub reads it on every deploy. Delete it
and the site falls back to the github.io address.

## DNS, at Cloudflare

The domain is registered at Cloudflare, so the records live in its dashboard.
Four A records and four AAAA records on the apex, all pointing at GitHub Pages,
plus `www` as a CNAME to `anyushkacorporan-cpu.github.io`:

    A     @     185.199.108.153
    A     @     185.199.109.153
    A     @     185.199.110.153
    A     @     185.199.111.153
    AAAA  @     2606:50c0:8000::153
    AAAA  @     2606:50c0:8001::153
    AAAA  @     2606:50c0:8002::153
    AAAA  @     2606:50c0:8003::153
    CNAME www   anyushkacorporan-cpu.github.io

**Every one of them DNS only, the grey cloud, not the orange one.** Proxied
records stop GitHub seeing the real request, which stops it issuing the
certificate, and the site answers with a redirect loop instead of a page. This
is the single most common way a custom domain sits broken for a day.

**No other A or AAAA record on the apex.** GitHub refuses to issue a
certificate if something else is answering there too.

## .app is HTTPS or nothing

`.app` is on the browser HSTS preload list, which means every browser refuses
plain HTTP for it before it ever asks the network. There is no insecure
fallback to look at while the certificate is being issued: until GitHub has
one, the site does not load at all. That takes anywhere from a few minutes to
about an hour after the DNS resolves, and looking broken during it is normal.

`index.html` is the one to put in the Instagram bio. The other two are there
because the App Store will not take a submission without them: a privacy policy
at a public address, and a support page at a public address. An in-app privacy
screen is not enough; App Store Connect wants a URL it can open.

## index.html, and the launch list

The app is not in the store yet, so this page is a "coming soon" that does not
waste the visit: the name, the year, and a box to leave an email address in, so
the people who came early can be told the day it opens. It is deliberately one
screen with nothing under it. Somebody arriving from a bio link gives it two
seconds, and everything that is not the email box is competing with the email
box.

The form posts to one Supabase function, `join_waitlist`, defined in
`supabase/27_waitlist.sql` with the reasoning behind its shape. The key in the
page is the publishable key, which is meant to be public and identifies the
project and nothing else; what it is allowed to do is decided in the database,
and there it is allowed to call that one function and nothing else. It cannot
read the list it writes to.

**That migration has to be run before the form works.** Until it is, the button
reports that it could not send.

## The welcome email

A second, separate thing, and deliberately so. `supabase/28_waitlist_welcome.sql`
and `supabase/functions/waitlist-welcome/` send one email per address, once
ever, the moment somebody signs up. The page asks for it and does not wait for
an answer, so none of this is load bearing: with the function undeployed or
Resend refusing, addresses are still saved and the page still confirms. Only
the email is lost, and an email can be sent later. An address cannot be
recovered later, which is why it is the half that stands alone.

`unsubscribe.html` is the other half of it: the link in the email carries a
random token belonging to that one row, and the page hands it to
`unsubscribe_waitlist()`, which deletes the row. It deletes rather than flags
because a flag means every query that reads this table has to remember the
flag, and the one that will not remember it is the one written in a hurry on
launch day. `select * from waitlist` stays honestly equal to the list of
people to write to.

To turn it on:

1. Make a Resend account and add `fourcircle.app` as a domain. Resend gives
   three DNS records; add them at Cloudflare, **DNS only, grey cloud**, next to
   the records already there. They are what let the mail be from the domain
   rather than merely claim to be.
2. Create an API key in Resend and give it to Supabase, never to a file here:
   `supabase secrets set RESEND_API_KEY=...`
3. Run `supabase/28_waitlist_welcome.sql` and `supabase/29_waitlist_unsubscribe.sql`
   in the SQL editor.
4. Deploy `waitlist-welcome`, either with `supabase functions deploy
   waitlist-welcome` or by pasting it into the dashboard's function editor,
   which needs no CLI.

Until step 4 the page carries on exactly as it does now.

Who has been written to is a column: `welcomed_at`. Null means they have not
been, which is also how to find anybody who signed up while this was off.

**Reading the list** happens in the Supabase dashboard, whose SQL editor runs as
the owner and is not subject to row-level security:

    select created_at::date, source, email
    from waitlist order by created_at;

`source` is where the link was, so the next link can go wherever the last one
worked.

To tag a link yourself, add `?from=`:

    https://fourcircle.app/?from=instagram-bio

## Why this page looks different from the other two

`privacy.html` and `support.html` are cream and black and plain, and this one is
dark and gold with a photograph. That is on purpose. Those two are read by an
App Store reviewer and by somebody with a problem; this one is the first thing a
stranger sees after tapping a link in a bio, and it is the only one that has to
look like the app does. It uses the same serif, the same gold and the same
photograph as the introduction inside the app, so the screenshots in a post and
the page the post links to are recognisably one thing.

The photograph is fixed rather than scrolling, and the page is sized to the
screen, so on a phone it behaves like a poster rather than like a document.

`hero.jpg` is `assets/images/onboarding/01-welcome.jpg` resized to 1100px and
saved at quality 66, because the app version is sized for a phone screen and
this one is sized for a phone connection.

## privacy.html is generated, not written

    node scripts/build-privacy-page.mjs

It is built from `app/privacy.tsx` so the web policy and the one inside the app
cannot drift apart, which is the whole reason the script exists. Edit the app
screen and re-run it; do not edit the html.

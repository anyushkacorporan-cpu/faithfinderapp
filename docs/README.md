# The public pages

Four files served from this folder by GitHub Pages, free, from a public
repository, with no domain and no host to pay for. Turn it on at
Settings → Pages → Source: deploy from a branch → main → /docs. The address is
then:

    https://anyushkacorporan-cpu.github.io/faithfinderapp/

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

**Reading the list** happens in the Supabase dashboard, whose SQL editor runs as
the owner and is not subject to row-level security:

    select created_at::date, source, email
    from waitlist order by created_at;

`source` is where the link was, so the next link can go wherever the last one
worked.

To tag a link yourself, add `?from=`:

    https://anyushkacorporan-cpu.github.io/faithfinderapp/?from=instagram-bio

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

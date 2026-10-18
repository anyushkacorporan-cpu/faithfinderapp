# legal/

Pages that belong to the app, not to the pre-launch website.

GitHub Pages publishes `docs/` only. Nothing in this folder is reachable on
fourcircle.app, which is the point: both files describe what the app does in
detail (GPS, posts, connections, ticket payments), and until launch the public
site is a teaser that deliberately says almost nothing.

| File | What it is |
| --- | --- |
| `app-privacy.html` | Generated from `app/privacy.tsx` by `scripts/build-privacy-page.mjs`. Never edit it; edit the app screen and re-run. |
| `app-support.html` | The full support page, with answers about claiming a church, wrong listings, ticket refunds and reporting. Hand-written. |

## At App Store submission

App Store Connect needs a public privacy policy URL, and reviewers read it
against the in-app screen, so this has to go live before the app ships.

    node scripts/build-privacy-page.mjs --publish

That writes `docs/app-privacy.html`, so the URL becomes
`https://fourcircle.app/app-privacy.html`. It does not touch
`docs/privacy.html`, which is the short notice about the waitlist email.

Copy `app-support.html` back to `docs/support.html` at the same time, so the
answers about churches and tickets exist for people who have the app. Give
App Store Connect `https://fourcircle.app/support.html` as the support URL.

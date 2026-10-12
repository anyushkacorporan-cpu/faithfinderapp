# The public pages

Three pages the App Store asks for before it will take a submission: a privacy
policy at a public address, a support page at a public address, and somewhere
for a reviewer to land. An in-app privacy screen is not enough — App Store
Connect wants a URL it can open.

GitHub Pages serves this folder from a public repository for nothing, with no
domain and no host to pay for. Turn it on at Settings → Pages → Source: deploy
from a branch → main → /docs.

`privacy.html` is generated, not written:

    node scripts/build-privacy-page.mjs

It is built from `app/privacy.tsx` so the web policy and the one inside the app
cannot drift apart, which is the whole reason the script exists. Edit the app
screen and re-run it; do not edit the html.

`index.html` and `support.html` are written by hand, in the same type and
colours the generated page uses, so the three read as one site.

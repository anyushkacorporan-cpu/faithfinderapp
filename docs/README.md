# The public pages

Three pages the App Store asks for before it will take a submission: a privacy
policy at a public address, a support page at a public address, and somewhere
for a reviewer to land. An in-app privacy screen is not enough — App Store
Connect wants a URL it can open.

They are served by GitHub Pages from this folder, which costs nothing on a
public repository and needs no domain, no host and no account beyond the one
that already holds this code. Turn it on at Settings → Pages → Source: deploy
from a branch → main → /docs.

The policy text is the same text the app shows, copied from `src/lib/i18n.ts`.
If one changes the other has to change with it — a privacy policy that
contradicts itself is worse than either version alone.

No build step, no dependencies, one small stylesheet. These pages have to keep
working for as long as the app is listed, long after anyone remembers how they
were made.

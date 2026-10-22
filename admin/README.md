# The moderation page

`index.html` is the owner's report queue: every report filed from the app,
with a button to take the reported post, comment or event down.

It is **not published**. GitHub Pages serves `docs/` and nothing else, so this
folder sits outside the website the same way `legal/` does. Putting it on
fourcircle.app is a decision, not a side effect of saving a file.

## Before it works

Run `supabase/30_admin.sql` in the Supabase SQL editor, then the insert at the
bottom of that file with your own email address. Until a row exists in
`admins`, the page signs you in and then tells you the account is not an admin
— which is the correct answer, and the proof that it is the database deciding
rather than the page.

## Running it

Opening the file directly from Finder will not work: a page loaded from
`file://` has no origin, and the browser blocks its requests. Serve the folder
instead:

    cd ~/faithfinderapp/admin && python3 -m http.server 8000

Then open <http://localhost:8000>. Stop it with Ctrl-C when finished.

## If it is published later

Copy `index.html` to `docs/admin.html` and it is live at
fourcircle.app/admin.html. That is safe to do, and worth being clear about
why: the page holds no secret. Anyone can open it, and what they can see is
decided by the token they sign in with and the policies in `30_admin.sql` —
not by whether they can find the URL.

What must never go in it is the service-role key. That key bypasses row-level
security entirely, and in a public web page it is a key everybody has.

## What it does not do yet

- **Accounts.** Deleting a person's account needs the admin auth API, which
  needs a server. Removing their posts is here; removing them is still the
  Supabase dashboard.
- **Church claims.** Claims are still granted the moment they are made, with
  no queue to approve or reject. An admin can now undo one — see the last
  section of `30_admin.sql` — but reviewing them before they take effect is a
  separate change.

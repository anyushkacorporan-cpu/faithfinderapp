# Turning email confirmation back on

The project currently confirms every new account automatically, via the
`dev_auto_confirm` trigger in `04_dev_autoconfirm.sql`. That is a development
measure and must not ship: without confirmation, anyone can create an account
using someone else's email address, and a password reset then sends a reset
link to a stranger's inbox.

It cannot simply be dropped. Supabase's built-in email sender is rate-limited
to a handful of messages an hour and frequently does not deliver at all — that
is what stranded every account created on 2 September. Dropping the trigger
before mail works means nobody can sign in, including you.

The order below is the order. Pick an option, then do the four steps.

---

## Option A — Gmail (no domain needed, start here)

Gmail will act as the mail server. Confirmation emails arrive from your own
address rather than a branded one, and Google caps a free account at roughly
500 messages a day — fine for early users, not for scale. It is enough to turn
confirmation on today rather than waiting on a domain.

Google will not accept your account password for this. You need an **App
Password**, which is a separate 16-character credential.

1. **Turn on 2-Step Verification** — Google Account → Security. App passwords
   do not exist as an option until this is on.
2. Google Account → Security → **App passwords** → name it "FaithFinder" →
   **Create**. Google shows 16 characters once. Copy them.
3. Supabase → **Project Settings → Authentication → SMTP Settings** →
   **Enable Custom SMTP**:

   | Field         | Value                        |
   |---------------|------------------------------|
   | Host          | `smtp.gmail.com`             |
   | Port          | `465`                        |
   | Username      | your full Gmail address      |
   | Password      | the 16-character App Password (spaces removed) |
   | Sender email  | your Gmail address           |
   | Sender name   | `FaithFinder`                |

   Save.

The App Password goes into the Supabase form and nowhere else — never into a
file in this repo, and never into a chat message. Revoke it from the same
Google page if it is ever exposed.

Then prove it works, and continue.

Move to Option B before launch: mail from a personal Gmail address looks like
a phishing attempt to anyone who does not know you, and 500/day is a ceiling
you would rather not discover on a good week.

---

## Option B — your own domain (before launch)

### B1. A domain

Confirmation email has to come *from* somewhere. Resend's free sender
(`onboarding@resend.dev`) only delivers to the address on your own Resend
account, so it will confirm your sign-ups and silently fail for every real
user — the worst kind of failure, because it looks like it works.

Buy the domain you intend to launch under. Any registrar. ~$12/year.

### B2. Resend

1. Sign up at resend.com — free tier is 3,000 emails/month, 100/day.
2. **Domains → Add Domain** → enter your domain.
3. Resend shows DNS records (an MX, and TXT records for SPF and DKIM). Add
   them at your registrar. Verification usually takes minutes; DNS can take
   up to 48 hours.
4. Wait for the domain to show **Verified**. Do not continue before this.
5. **API Keys → Create API Key**, sending permission. Copy it — it is shown
   once.

### B3. Supabase SMTP

Dashboard → **Project Settings → Authentication → SMTP Settings** →
**Enable Custom SMTP**:

| Field         | Value                                  |
|---------------|----------------------------------------|
| Host          | `smtp.resend.com`                      |
| Port          | `465`                                  |
| Username      | `resend`                               |
| Password      | your Resend API key                    |
| Sender email  | `no-reply@yourdomain.com`              |
| Sender name   | `FaithFinder`                          |

Save.

---

## Step 1 — prove mail actually sends

Whichever option you took. Supabase → Authentication → **Users** → **Add
user** → tick "Send invite email", addressed to an inbox you can read that is
**not** the account you configured SMTP with — sending to yourself can succeed
where sending to anyone else fails, which is the exact trap Resend's free
sender sets.

If the invite arrives, mail works. If it does not, stop here and fix it.
Everything below depends on this and nothing else will tell you it is broken:
a sign-up with no working mail looks identical to a wrong password.

## Step 2 — point the links at the app

Supabase sends people to the project's **Site URL**, which starts as
`http://localhost:3000` — a web address no phone answers. The link still
works: Supabase verifies the token on its own server before redirecting, so
the account is confirmed even when the browser then shows "site can't be
reached". It just looks broken, which for most people is the same thing.

Supabase → Authentication → **URL Configuration**:

- **Site URL**: `faithfinder://`
- **Redirect URLs**, add both:
  - `faithfinder://*` — published builds
  - `exp://192.168.1.66:8081` — Expo Go while developing (your LAN address
    changes; add whatever `npx expo start` prints)

The app reads these links and finishes the sign-in itself (`authLinking.ts`),
so a confirmation link opens the app signed in, and a reset link opens the
screen for choosing a new password.

## Step 3 — drop the trigger

Only once steps 1 and 2 are done:

```sql
drop trigger if exists dev_auto_confirm on auth.users;
drop function if exists dev_auto_confirm_email();
```

Confirmation is already required at the project level — the trigger was
overriding it — so nothing else needs enabling.

## Step 4 — verify

```
node scripts/check-auth.mjs
```

Expected, and this is success rather than failure:

```
3. Creating a throwaway account
  ✓ sign-up accepted
    no session returned — this project requires email confirmation
4. Signing back in
  ✗ sign-in failed (400)
    Email not confirmed
```

That is confirmation doing its job. Then create a real account in the app with
an address you can read, and check that the email arrives and the link works.

## Rolling back

If mail breaks after launch and people cannot sign in, re-running
`04_dev_autoconfirm.sql` restores automatic confirmation and unblocks
everyone. It reopens the impersonation hole, so treat it as an incident
measure and fix the mail.

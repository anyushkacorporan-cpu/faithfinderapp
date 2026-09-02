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

The order below is the order. Do not skip to step 4.

---

## 1. A domain

Confirmation email has to come *from* somewhere. Resend's free sender
(`onboarding@resend.dev`) only delivers to the address on your own Resend
account, so it will confirm your sign-ups and silently fail for every real
user — the worst kind of failure, because it looks like it works.

Buy the domain you intend to launch under. Any registrar. ~$12/year.

## 2. Resend

1. Sign up at resend.com — free tier is 3,000 emails/month, 100/day.
2. **Domains → Add Domain** → enter your domain.
3. Resend shows DNS records (an MX, and TXT records for SPF and DKIM). Add
   them at your registrar. Verification usually takes minutes; DNS can take
   up to 48 hours.
4. Wait for the domain to show **Verified**. Do not continue before this.
5. **API Keys → Create API Key**, sending permission. Copy it — it is shown
   once.

## 3. Supabase SMTP

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

**Prove it before going further.** Authentication → Users → **Add user** →
"Send invite email" to an address you can read that is *not* your Resend
account address. If it arrives, SMTP works. If it does not, stop and fix it —
step 4 depends entirely on this.

## 4. Drop the trigger

Only once step 3 is proven:

```sql
drop trigger if exists dev_auto_confirm on auth.users;
drop function if exists dev_auto_confirm_email();
```

Confirmation is already required at the project level — the trigger was
overriding it — so nothing else needs enabling.

## 5. Verify

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

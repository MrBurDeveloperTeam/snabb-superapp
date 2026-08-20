# Company member module

`subuser/` uses the existing Supabase client and normal `authOdoo` account-creation service. That existing service creates the `profiles` row and triggers the normal account-verification flow. Secure invitation validation and `company_members` creation stay in `supabase/functions/company-invitations/`.

## Where to edit

- Role choices: `subuser/config.ts`
- Signup base URL: function secret `APP_URL` (`http://localhost:3000` for local testing or `https://app.snabbb.com` for production)

The function returns `inviteUrl`, then the browser opens a prefilled `mailto:` draft. The owner sends it through their configured email application. This requires no Odoo or email-provider secret, but the owner must press Send manually.

Deploy with `supabase functions deploy company-invitations --no-verify-jwt`. The function validates public invite tokens internally and validates authenticated company owners for management actions.

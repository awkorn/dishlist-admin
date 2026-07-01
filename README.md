# DishList Safety Operations

Private moderation dashboard for reviewing user-generated-content reports.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set the API URL and the same Supabase project used by the mobile app.
3. Run `npm install` and `npm run dev`.
4. Sign in with a DishList account whose database role is `MODERATOR` or `ADMIN`.

The browser client contains only the Supabase anonymous key. Every moderation
request is authorized again by the API using the signed user token and database
role.

## Moderator access

Bootstrap or change a role from the API directory:

```bash
npm run admin:role -- moderator@example.com MODERATOR
npm run admin:role -- owner@example.com ADMIN
npm run admin:role -- former-moderator@example.com USER
```

Moderators can claim, dismiss, hide content, and suspend users. Only admins can
restore a target.

## Vercel

Create a Vercel project rooted at `dishlist-admin` and configure:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Validate a preview deployment before promotion. Do not place service-role keys,
database credentials, or moderator secrets in this project.

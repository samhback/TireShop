# Supabase Setup

## Recommended Setup

Use Supabase only as hosted PostgreSQL for now.

Current app needs:
- Hosted Postgres database
- Prisma migrations
- Local development connected through `DATABASE_URL`

Current app does **not** need yet:
- Supabase Auth
- Supabase Storage
- Realtime
- Edge Functions
- Customer-facing APIs

## Create the Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Suggested project name: `healdton-service-center`
4. Choose the region closest to Oklahoma / central US if available
5. Save the database password somewhere secure

## Get the Database Connection String

In the Supabase project dashboard:

1. Click **Connect**
2. Choose the connection string for Postgres / Prisma
3. Prefer the **Session pooler** connection string for local development if direct IPv6 is not available
4. Copy the connection string

The app will store it in `.env`:

```env
DATABASE_URL="postgresql://..."
```

Never commit `.env` to git.

If the password contains special characters, URL-encode it before adding it to `DATABASE_URL`. For example:

- `@` becomes `%40`
- `^` becomes `%5E`
- `#` becomes `%23`
- `/` becomes `%2F`

This project stores the local connection values in `.env.local`, which is ignored by git.

## Prisma User

Supabase recommends creating a separate database user for Prisma instead of using the default `postgres` user.

Run this in the Supabase SQL editor, replacing `custom_password` with a generated password:

```sql
create user "prisma" with password 'custom_password' bypassrls createdb;

grant "prisma" to "postgres";

grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;

alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

Then update the connection string to use the `prisma` user and that password.

## Local Development Flow

Once the app exists:

```bash
npx prisma migrate dev
npx prisma generate
```

Local development and hosted deployment should both use PostgreSQL so schema behavior stays consistent.

## Before Real Shop Data

Before Logan starts using real customer data:

- Create a separate production database/project
- Keep development seed data out of production
- Rotate any shared development passwords
- Back up the production database

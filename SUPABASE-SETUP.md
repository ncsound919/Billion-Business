# Supabase Setup Guide

## 1. Create Supabase Project

### Step 1: Initialize Supabase
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in details:
   - **Project Name:** grader-prod (or your choice)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users
4. Click "Create new project" and wait for setup (~5 minutes)

### Step 2: Get Connection Details
Once your project is ready:
1. Go to **Settings → Database → Connection String**
2. Select **Connection pooler** (recommended)
3. Copy the **Transaction mode** connection string
4. Replace `[YOUR-PASSWORD]` with the database password you created
5. This becomes your `DATABASE_URL`

Example format:
```
postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

---

## 2. Initialize Database Schema

### Option A: Using psql (Recommended)
```bash
# Install psql if you don't have it
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Run the schema
psql "postgresql://postgres.[PROJECT-ID]:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres" \
  -f src/server/db/schema.sql
```

### Option B: Using Supabase Web Console
1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Copy entire contents of `src/server/db/schema.sql`
4. Paste into the editor
5. Click **Run**

### Option C: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref PROJECT_ID

# Push schema
supabase migration new create_schema
# (copy schema.sql contents into the migration file)
supabase migration up
```

---

## 3. Create Supabase Project Credentials

### Generate Anon Key & Service Role Key
1. Go to **Settings → API**
2. Copy the following keys:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` (frontend)
   - **service_role** key → `SUPABASE_SERVICE_KEY` (backend only!)

⚠️ **IMPORTANT:** Never expose `SUPABASE_SERVICE_KEY` in frontend code!

---

## 4. Environment Variables

Add these to your `.env` file:

```bash
# Supabase
DATABASE_URL=postgresql://postgres.[PROJECT-ID]:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
SUPABASE_SERVICE_KEY=eyJhbGc... (your service role key - BACKEND ONLY!)

# Other existing vars
GITHUB_TOKEN=...
GEMINI_API_KEY=...
STRIPE_SECRET_KEY=...
FRONTEND_URL=...
```

---

## 5. Set Up Row-Level Security (RLS)

For production, enable RLS on sensitive tables:

```sql
-- In Supabase SQL Editor, run:

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- Enable RLS on orgs table
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read"
  ON orgs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()::uuid
    )
  );

-- Enable RLS on scans table
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read org scans"
  ON scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = scans.org_id
      AND org_members.user_id = auth.uid()::uuid
    )
  );
```

---

## 6. Configure GitHub OAuth in Supabase

1. Go to **Authentication → Providers**
2. Find **GitHub**
3. Enable it
4. Fill in:
   - **Client ID:** (from your GitHub OAuth app)
   - **Client Secret:** (from your GitHub OAuth app)
5. Copy the **Callback URL** that Supabase provides
6. Add this callback URL to your GitHub OAuth app settings

---

## 7. Set Up Auth Webhooks (Optional)

To sync user data from Supabase Auth to your `users` table:

1. Go to **Database → Webhooks**
2. Create webhook for auth.users table:
   - **Event:** INSERT
   - **Webhook URL:** `https://yourdomain.com/api/v1/auth/supabase-webhook`
   - **Method:** POST

---

## 8. Test Connection

```bash
# Add this test to verify database connection works
curl https://yourdomain.com/readyz
# Should return: {"status":"ready",...}
```

---

## 9. Backup & Monitoring

### Enable Automated Backups
1. Go to **Settings → Backups**
2. Choose backup frequency (recommended: Daily)
3. Set retention period (recommended: 7+ days)

### Monitor Database
1. Go to **Database → Realtime**
2. Monitor for any errors or performance issues
3. Check **Logs** for query execution

---

## 10. Scale & Optimization

As you grow:
1. **Connection Pooling:** Already using Transaction mode ✅
2. **Database Indexes:** Supabase auto-creates on primary keys
3. **Archive Old Scans:** Implement cleanup for old scan records
4. **Read Replicas:** Available on paid plans

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Connection refused | Verify DATABASE_URL format, check IP whitelist |
| "password authentication failed" | Reset database password in Supabase settings |
| Slow queries | Check indexes, enable query performance metrics |
| RLS blocking legitimate requests | Review RLS policies, add debug logging |

---

## Supabase Dashboard URLs

- **Main Dashboard:** https://app.supabase.com
- **SQL Editor:** https://app.supabase.com/project/PROJECT_ID/sql
- **Database Settings:** https://app.supabase.com/project/PROJECT_ID/settings/database
- **Auth Settings:** https://app.supabase.com/project/PROJECT_ID/auth/providers
- **Backups:** https://app.supabase.com/project/PROJECT_ID/settings/backups

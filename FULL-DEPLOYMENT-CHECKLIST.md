# Production Deployment Checklist: Supabase + Vercel + Railway

**Estimated Time:** 1-2 hours  
**Difficulty:** Medium (mostly configuration, no coding)

---

## 📋 Phase 1: Preparation (15 minutes)

### 1.1 Security - Revoke Exposed Secrets
- [ ] **GitHub PAT:** Go to https://github.com/settings/tokens → Revoke compromised token
- [ ] **Google API Key:** Go to https://aistudio.google.com/app/apikey → Delete old key
- [ ] **Verify .env deleted:** `ls -la .env` should show file does NOT exist
- [ ] **Verify .gitignore:** `.env` should be in `.gitignore`

### 1.2 Generate New Credentials
- [ ] Create new **GitHub Personal Access Token**
  - Go to https://github.com/settings/tokens
  - Scopes needed: `repo` (full), `admin:org_hook` (for webhooks)
  - Save token securely
  
- [ ] Create new **Google Gemini API Key**
  - Go to https://aistudio.google.com/app/apikey
  - Create new key
  - Enable Gemini API
  
- [ ] Create **Stripe test keys** (if not already done)
  - Go to https://dashboard.stripe.com/apikeys
  - Copy test Secret Key and Publishable Key

### 1.3 Buy Domain (Optional but Recommended)
- [ ] Register domain at Namecheap, GoDaddy, or similar
- [ ] Domain examples: `grader.io`, `codehealth.app`, etc.
- [ ] Estimated cost: $12-15/year

---

## 🗄️ Phase 2: Supabase Setup (15 minutes)

### 2.1 Create Supabase Project
- [ ] Go to https://app.supabase.com
- [ ] Click **New Project**
- [ ] **Name:** `grader-prod` (or your choice)
- [ ] **Password:** Generate & save securely
- [ ] **Region:** Choose closest to your users
- [ ] Wait ~5 minutes for provisioning

### 2.2 Get Database Credentials
- [ ] Go to **Settings → Database → Connection String**
- [ ] Select **Connection pooler** mode
- [ ] Copy the connection string URL
- [ ] Save as `DATABASE_URL` (you'll need this for Railway)

### 2.3 Initialize Database Schema
```bash
# Option A: Using psql (recommended)
psql "postgresql://postgres.[PROJECT_ID]:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres" \
  -f src/server/db/schema.sql

# Option B: Using Supabase SQL Editor (copy-paste contents)
# Go to SQL Editor → New Query → paste schema → Run
```
- [ ] Schema created successfully (check Supabase Tables tab)
- [ ] Verify tables exist: users, orgs, scans, subscriptions, etc.

### 2.4 Generate API Keys (For OAuth)
- [ ] Go to **Settings → API**
- [ ] Copy **Project URL** → Save as `SUPABASE_URL`
- [ ] Copy **anon public key** → Save as `SUPABASE_ANON_KEY`
- [ ] Copy **service_role key** → Save as `SUPABASE_SERVICE_KEY` (backend only)

### 2.5 Setup GitHub OAuth in Supabase
- [ ] Go to **Authentication → Providers → GitHub**
- [ ] Enable GitHub
- [ ] Fill in:
  - **Client ID:** From your GitHub OAuth app
  - **Client Secret:** From your GitHub OAuth app
- [ ] Copy the **Callback URL** that Supabase provides
- [ ] Update your GitHub OAuth app with this callback URL

---

## 🚀 Phase 3: Deploy Backend to Railway (20 minutes)

### 3.1 Create Railway Account
- [ ] Go to https://railway.app
- [ ] Sign up with GitHub
- [ ] Authorize Railway

### 3.2 Create Project & Connect GitHub
- [ ] Click **New Project**
- [ ] Select **Deploy from GitHub repo**
- [ ] Select your **Billion-Business** repo
- [ ] Click **Deploy Now**
- [ ] Wait ~3 minutes for build to complete

### 3.3 Add PostgreSQL Database
- [ ] In Railway, click **New → Add Service**
- [ ] Select **Database → PostgreSQL**
- [ ] Wait ~1 minute for setup
- [ ] Copy the auto-generated `DATABASE_URL`

### 3.4 Set Environment Variables
In Railway Node service, click **Variables** and add:

```
DATABASE_URL=<from PostgreSQL plugin>
GITHUB_TOKEN=<your new github token>
GEMINI_API_KEY=<your new google key>
STRIPE_SECRET_KEY=<your stripe secret>
STRIPE_PUBLISHABLE_KEY=<your stripe public key>
STRIPE_WEBHOOK_SECRET=<we'll get this later>
FRONTEND_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

- [ ] All variables added
- [ ] Deployment triggered automatically

### 3.5 Get Public URL
- [ ] Go to **Deployments** tab
- [ ] Wait for deployment to complete (shows "Deployed")
- [ ] Copy the **Public URL** 
  - Example: `https://grader-prod.up.railway.app`
- [ ] Save this URL - you'll need it for Vercel

### 3.6 Verify Deployment
```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/healthz
# Should return: {"status":"healthy","timestamp":"..."}

# Test readiness
curl https://your-railway-url.up.railway.app/readyz
# Should return: {"status":"ready",...}
```
- [ ] Both endpoints return success

---

## 🎨 Phase 4: Deploy Frontend to Vercel (15 minutes)

### 4.1 Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Click **Sign Up**
- [ ] Sign in with GitHub
- [ ] Authorize Vercel

### 4.2 Deploy Project
- [ ] Click **Add New → Project**
- [ ] Select your **Billion-Business** repo
- [ ] Vercel auto-detects Vite config ✅
- [ ] Framework: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`

### 4.3 Add Environment Variables
In Vercel project settings:
- [ ] Go **Settings → Environment Variables**
- [ ] Add: `VITE_API_URL` = `https://your-railway-url.up.railway.app`
- [ ] Click **Deploy**
- [ ] Wait ~2 minutes for build

### 4.4 Get Vercel URL
- [ ] Go to **Deployments**
- [ ] Copy the **Production URL** 
  - Example: `https://grader.vercel.app`
- [ ] Save this URL

### 4.5 Update Backend Environment
Back in Railway:
- [ ] Update `FRONTEND_URL` variable
- [ ] Set to: `https://your-vercel-domain.vercel.app`
- [ ] Redeploy: Click **Redeploy** button

### 4.6 Verify Frontend
- [ ] Open `https://your-vercel-domain.vercel.app` in browser
- [ ] Check that it loads (you should see the Grader UI)
- [ ] Open **DevTools → Network** to verify `VITE_API_URL` is correct

---

## 💳 Phase 5: Configure Stripe (10 minutes)

### 5.1 Set Up Webhook
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Click **Add Endpoint**
- [ ] **Endpoint URL:** `https://your-railway-url.up.railway.app/api/v1/billing/webhook`
- [ ] **Select Events:**
  - `payment_intent.succeeded`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
- [ ] Click **Add Events**
- [ ] Click **Create Endpoint**

### 5.2 Get Webhook Secret
- [ ] Copy the **Signing secret**
- [ ] Looks like: `whsec_...`
- [ ] Go back to Railway
- [ ] Update `STRIPE_WEBHOOK_SECRET` variable
- [ ] Redeploy

### 5.3 Get Publishable Key
- [ ] Go to https://dashboard.stripe.com/apikeys
- [ ] Copy **Publishable key** (starts with `pk_`)
- [ ] Update `STRIPE_PUBLISHABLE_KEY` in Railway
- [ ] Redeploy

---

## 🌐 Phase 6: Custom Domain (Optional, 10 minutes)

If you bought a domain in Phase 1:

### 6.1 Point Domain to Vercel
- [ ] Go to Vercel project **Settings**
- [ ] Click **Domains**
- [ ] Add your domain
- [ ] Vercel shows DNS records to add
- [ ] In your registrar (Namecheap, GoDaddy):
  - Add CNAME record: `www.yourdomain.com → vercel.com`
  - Add A record: `yourdomain.com → 76.76.19.165`
- [ ] Wait ~5 minutes for DNS propagation

### 6.2 Update Environment Variables
- [ ] In Railway: Update `FRONTEND_URL` to `https://yourdomain.com`
- [ ] In Vercel: Update `VITE_API_URL` if using custom backend domain
- [ ] Redeploy both services

---

## ✅ Phase 7: Final Verification (15 minutes)

### 7.1 Test All Endpoints
```bash
# Health check
curl https://your-railway-url/healthz

# Ready check
curl https://your-railway-url/readyz

# Frontend loads
open https://your-vercel-domain

# GitHub OAuth
# Click "Login with GitHub" button in UI
```

### 7.2 Test Database Connection
```bash
# Login to app
# Should work without errors
```

### 7.3 Test Stripe Integration
```bash
# Use Stripe test card: 4242 4242 4242 4242
# Try to upgrade from free plan
# Should see payment form
```

### 7.4 Check Logs
- [ ] **Railway:** Click **Logs** tab, check for errors
- [ ] **Vercel:** Go to **Deployments**, check build logs
- [ ] **Supabase:** Go to **Logs Explorer**, check queries

### 7.5 Enable Monitoring & Alerts
- [ ] **Railway:** Set up error alerts (optional)
- [ ] **Vercel:** Configure performance monitoring
- [ ] **Supabase:** Enable backup alerts

---

## 🚨 Troubleshooting

| Issue | Debugging |
|-------|-----------|
| **CORS errors in browser** | Check `FRONTEND_URL` in Railway matches Vercel domain |
| **Cannot connect to database** | Verify `DATABASE_URL` format, check Supabase firewall |
| **GitHub OAuth fails** | Check callback URL in Supabase matches GitHub OAuth settings |
| **Stripe webhook not working** | Check webhook URL in Stripe dashboard, verify `STRIPE_WEBHOOK_SECRET` |
| **Build failures** | Check build logs in Vercel & Railway, run `npm run build` locally |
| **API 404 errors** | Verify `VITE_API_URL` is correct (no trailing slash) |

---

## 📊 Cost Summary

| Service | Free Tier | Production Cost |
|---------|-----------|-----------------|
| **Supabase** | 500MB DB | ~$25-100/mo |
| **Vercel** | 100 builds/mo | ~$0-20/mo |
| **Railway** | 5GB CPU | ~$5-50/mo |
| **Stripe** | 2.9% + $0.30 | 2.9% + $0.30 per transaction |
| **Domain** | - | ~$12/year |
| **Total** | $0 | ~$50-200/mo |

---

## 📈 Next Steps After Deployment

1. **Monitor in production:**
   - Check logs daily for first week
   - Monitor database connections
   - Track Stripe webhook deliveries

2. **Setup backups:**
   - Supabase: Enable automated backups
   - Database: Configure daily snapshots

3. **Security improvements:**
   - Enable HTTPS everywhere (automatic on Vercel/Railway)
   - Set up DDoS protection (Cloudflare optional)
   - Configure WAF rules (optional)

4. **Performance optimization:**
   - Monitor bundle sizes in Vercel Analytics
   - Optimize database queries (check slow logs)
   - Consider CDN for static assets (Vercel includes)

5. **Scaling:**
   - Monitor CPU/Memory usage
   - Scale Railway container if needed
   - Enable read replicas on Supabase (paid)

---

## 🎉 Deployment Complete!

Your app is now live at:
- **Frontend:** `https://your-vercel-domain.vercel.app`
- **Backend API:** `https://your-railway-url.up.railway.app`
- **Database:** Supabase PostgreSQL

**Total setup time:** ~1-2 hours  
**Ongoing maintenance:** ~5-10 hours/month

Congratulations! 🚀

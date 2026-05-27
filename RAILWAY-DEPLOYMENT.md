# Railway Deployment Guide

Deploy the Billion Business Grader backend to Railway.com

---

## 1. Create Railway Account

1. Go to https://railway.app
2. Click **Sign Up**
3. Choose **Sign in with GitHub**
4. Authorize Railway
5. Create a new **Project**

---

## 2. Connect Your GitHub Repository

1. In Railway project, click **New → GitHub Repo**
2. Select your **Billion-Business** repository
3. Click **Deploy Now**

Railway will auto-detect:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

✅ Keep these as default (they're correct)

---

## 3. Add PostgreSQL Database

1. Click **New → Add Service**
2. Select **Database → PostgreSQL**
3. Wait for provisioning (~1 minute)
4. Copy the `DATABASE_URL` that Railway generates
5. Add it as environment variable in your Node service

---

## 4. Configure Environment Variables

In Railway dashboard, go to your **Node service**:

1. Click **Variables**
2. Click **Add Variable** and add each:

```
DATABASE_URL=<copy from PostgreSQL plugin>
GITHUB_TOKEN=<your github token>
GEMINI_API_KEY=<your google gemini key>
STRIPE_SECRET_KEY=<your stripe secret key>
STRIPE_PUBLISHABLE_KEY=<your stripe public key>
STRIPE_WEBHOOK_SECRET=<your webhook secret>
FRONTEND_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

---

## 5. Initialize Database Schema

Two options:

### Option A: Using Railway CLI (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link <project-id>

# Get database connection
railway variables get DATABASE_URL

# Connect to database and run schema
psql "<database-url>" -f src/server/db/schema.sql
```

### Option B: Using pgAdmin
1. In Railway, click on **PostgreSQL** plugin
2. Click **Connect**
3. Use pgAdmin to run `src/server/db/schema.sql`

---

## 6. Get Public URL

1. Go back to your **Node service**
2. Click **Deployments**
3. Wait for deployment to complete (shows "Deployed")
4. Copy the **Public URL** (e.g., `https://grader-prod.up.railway.app`)
5. This is your `VITE_API_URL` for the Vercel frontend

---

## 7. Configure Vercel to Use Railway Backend

After your Railway app is deployed:

1. Go to Vercel dashboard
2. Select your frontend project
3. Go to **Settings → Environment Variables**
4. Add/update:
   ```
   VITE_API_URL = https://your-railway-url.up.railway.app
   ```
5. Redeploy: Click **Deployments → Redeploy**

---

## 8. Test Deployment

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/healthz
# Expected: {"status":"healthy","timestamp":"..."}

# Test readiness
curl https://your-railway-url.up.railway.app/readyz
# Expected: {"status":"ready","timestamp":"..."}
```

---

## 9. Configure Stripe Webhook

Stripe needs to send webhooks to your backend:

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. URL: `https://your-railway-url/api/v1/billing/webhook`
4. Events to send:
   - `payment_intent.succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the **Signing Secret**
6. Add to Railway environment: `STRIPE_WEBHOOK_SECRET=<secret>`

---

## 10. Monitor Deployment

### View Logs
1. In Railway dashboard, click your **Node service**
2. Click **Logs**
3. Watch real-time logs as requests come in

### Check Metrics
1. Click **Monitoring**
2. View CPU, Memory, Network usage
3. Set up alerts if needed

### Database Monitoring
1. Click **PostgreSQL** plugin
2. View connection count, query performance
3. Monitor database size growth

---

## 11. Scale & Auto-Restart

### Enable Auto-Restart
1. Click **Node service**
2. Go **Settings**
3. Enable **Auto-restart on crash**

### Increase Resources
If you need more performance:
1. Click **Node service → Settings**
2. Increase **Memory** (default 512MB)
3. Increase **CPU** (default shared)
4. Changes take effect on next deploy

---

## 12. Custom Domain (Optional)

To use `api.yourdomain.com` instead of railway URL:

1. Click **Node service**
2. Go **Settings → Custom Domain**
3. Enter `api.yourdomain.com`
4. Add CNAME record in your DNS provider:
   ```
   api.yourdomain.com CNAME your-railway-url.up.railway.app
   ```

---

## 13. Automated Backups

Railway PostgreSQL includes automatic backups:

1. Click **PostgreSQL plugin**
2. Go **Settings → Backups**
3. Verify backup frequency and retention

To download backups:
```bash
# List backups
railway backups list

# Download backup
railway backups download <backup-id>
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Build fails** | Check `npm run build` locally works first |
| **App crashes** | Check logs: `railway logs` |
| **Database connection error** | Verify `DATABASE_URL` format, check PostgreSQL is running |
| **Stripe webhook not working** | Verify webhook URL in Stripe dashboard, check logs for 403 CSRF errors |
| **Out of memory** | Increase Memory allocation in Settings |
| **Slow queries** | Check database indexes in SQL, monitor slow query logs |

---

## Railway CLI Commands

```bash
# Login to Railway
railway login

# Link to project
railway link <project-id>

# View environment variables
railway variables

# View logs
railway logs

# SSH into container
railway shell

# Redeploy
railway deploy

# Scale service
railway scale api=2
```

---

## Cost Estimation

Railway's free tier includes:
- ✅ 5GB monthly CPU
- ✅ 512MB RAM (shared)
- ✅ 1GB PostgreSQL storage

For production:
- **Basic:** ~$5-10/month
- **Standard:** ~$20-50/month
- **High traffic:** $50-200+/month

Check pricing at https://railway.app/pricing

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Connect Vercel to Railway backend (VITE_API_URL)
4. ✅ Configure Stripe webhooks
5. ✅ Set up monitoring/alerts
6. ✅ Configure custom domain (optional)
7. ✅ Enable auto-backups

Your production app is now live! 🚀

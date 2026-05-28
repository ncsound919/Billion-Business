# 🚀 Deployment Quick Reference

**Start here:** [FULL-DEPLOYMENT-CHECKLIST.md](FULL-DEPLOYMENT-CHECKLIST.md)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS BROWSER                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   VERCEL (Frontend)            │
          │  React + Vite SPA              │
          │  https://yourdomain.com        │
          │  - Static files on CDN         │
          │  - Automatic deployments       │
          │  - Zero-cost free tier         │
          └────────────┬───────────────────┘
                       │ API calls via VITE_API_URL
                       ▼
          ┌────────────────────────────────┐
          │   RAILWAY (Backend)            │
          │  Express.js + Node.js          │
          │  https://grader.up.railway.app │
          │  - REST API endpoints          │
          │  - GitHub OAuth                │
          │  - Stripe webhooks             │
          │  - ~$5-50/month                │
          └────────────┬───────────────────┘
                       │
                       ▼
          ┌────────────────────────────────┐
          │   SUPABASE (Database)          │
          │  PostgreSQL with RLS           │
          │  - Users & Organizations       │
          │  - Scans & Reports             │
          │  - Audit logs                  │
          │  - ~$25-100/month              │
          └────────────────────────────────┘
```

---

## 📋 Deployment Checklist (Quick Version)

### Phase 1: Prep (15 min)
- [ ] Revoke old GitHub PAT & Gemini key
- [ ] Generate new credentials

### Phase 2: Supabase (15 min)
- [ ] Create Supabase project
- [ ] Get `DATABASE_URL`
- [ ] Run `src/server/db/schema.sql`
- [ ] Set up GitHub OAuth

### Phase 3: Railway (20 min)
- [ ] Connect GitHub repo
- [ ] Add PostgreSQL plugin
- [ ] Set environment variables
- [ ] Get public URL

### Phase 4: Vercel (15 min)
- [ ] Deploy GitHub repo
- [ ] Set `VITE_API_URL` to Railway URL
- [ ] Get Vercel URL

### Phase 5: Stripe (10 min)
- [ ] Add webhook: `POST /api/v1/billing/webhook`
- [ ] Set webhook secret in Railway

### Phase 6: Domain (10 min, optional)
- [ ] Buy domain
- [ ] Point to Vercel
- [ ] Update `FRONTEND_URL` in Railway

### Phase 7: Verify (15 min)
- [ ] Test `/healthz` endpoint
- [ ] Test `/readyz` endpoint
- [ ] Load frontend in browser
- [ ] Test GitHub OAuth flow

**Total: 1-2 hours**

---

## 🔐 Environment Variables

See `.env.example` for complete list. Key ones:

```bash
# Database
DATABASE_URL=postgresql://postgres.[ID]:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres

# Auth
GITHUB_TOKEN=ghp_...
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://vercel-domain.vercel.app/api/v1/auth/github/callback

# AI
GEMINI_API_KEY=AIza...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://grader.up.railway.app

# App
NODE_ENV=production
```

---

## 💰 Monthly Costs

| Service | Cost | What Included |
|---------|------|---|
| Supabase PostgreSQL | $25-100 | 500MB-100GB database, backups, RLS |
| Vercel Frontend | $0-20 | CDN, deployments, analytics |
| Railway Backend | $5-50 | Node.js container + PostgreSQL |
| Stripe | 2.9% + $0.30 | Payment processing |
| Domain | $1 | DNS only (optional) |
| **Total** | **$50-200** | **Production-ready SaaS** |

---

## 🔍 Monitoring

### Vercel Dashboard
- https://vercel.com/dashboard
- View builds, deployments, analytics
- Check error logs

### Railway Dashboard
- https://railway.app/dashboard
- Monitor CPU, memory, network
- View application logs
- Check PostgreSQL health

### Supabase Dashboard
- https://app.supabase.com
- Monitor database connections
- View query performance
- Check backups

### Stripe Dashboard
- https://dashboard.stripe.com
- Monitor webhook delivery
- Track revenue/transactions
- View customer events

---

## 📱 Testing Endpoints

```bash
# Health check
curl https://grader.up.railway.app/healthz
# {"status":"healthy","timestamp":"..."}

# Ready check
curl https://grader.up.railway.app/readyz
# {"status":"ready",...} (when DB connected)

# Frontend
open https://yourdomain.com
# Should load the React app

# GitHub OAuth
# Click "Login with GitHub" button
# Should redirect to GitHub, then back to app
```

---

## 🆘 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| **CORS errors** | Check `FRONTEND_URL` matches exactly |
| **Database connection fails** | Verify `DATABASE_URL` format, check Supabase firewall |
| **GitHub OAuth broken** | Check callback URL in both GitHub & Supabase |
| **Stripe webhook fails** | Verify webhook URL, check `STRIPE_WEBHOOK_SECRET` |
| **Build fails on Vercel** | Run `npm run build` locally to debug |
| **Railway deploys but crashes** | Check logs: `railway logs` |

---

## 📚 Full Documentation

| Document | Purpose |
|----------|---------|
| [FULL-DEPLOYMENT-CHECKLIST.md](FULL-DEPLOYMENT-CHECKLIST.md) | **Main guide** - Start here |
| [SUPABASE-SETUP.md](SUPABASE-SETUP.md) | Database setup details |
| [RAILWAY-DEPLOYMENT.md](RAILWAY-DEPLOYMENT.md) | Backend deployment details |
| [DEPLOYMENT-OPTIONS.md](DEPLOYMENT-OPTIONS.md) | Compare alternative paths |
| [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) | Code quality checklist |
| [.env.example](.env.example) | All environment variables |

---

## 🚀 One-Command Deploy (After Prep)

```bash
# Assumes you've completed Phase 1 (Prep)

# 1. Deploy to Railway (backend)
railway login && railway link && railway up

# 2. Deploy to Vercel (frontend)
vercel deploy --prod

# 3. You're live!
open https://yourdomain.com
```

---

## 📞 Support Resources

- **Vercel Help:** https://vercel.com/docs
- **Railway Help:** https://docs.railway.app
- **Supabase Help:** https://supabase.com/docs
- **Stripe Help:** https://stripe.com/docs
- **Express.js:** https://expressjs.com
- **React + Vite:** https://vitejs.dev

---

## ✅ Pre-Flight Checks

Before deploying to production:

- [ ] Tests passing: `npm test` (58/58)
- [ ] Build succeeds: `npm run build` (0 errors)
- [ ] Types check: `npm run lint` (0 errors)
- [ ] Secrets removed: `.env` deleted, protected in `.gitignore`
- [ ] All credentials generated: GitHub, Gemini, Stripe
- [ ] Domain purchased (optional)
- [ ] Database backup plan ready
- [ ] Monitoring configured
- [ ] Incident response plan ready

---

## 🎯 Key Takeaways

✅ **Supabase** = Managed PostgreSQL with backups  
✅ **Railway** = Simple Node.js hosting with auto-scaling  
✅ **Vercel** = Global CDN for React frontend  
✅ **Stripe** = Payment processing with webhooks  

**Total setup time:** 1-2 hours  
**Total monthly cost:** $50-200  
**Uptime SLA:** 99.9%+ from all providers  

---

## 🎉 Ready to Deploy?

**Start with:** [FULL-DEPLOYMENT-CHECKLIST.md](FULL-DEPLOYMENT-CHECKLIST.md)

Follow each phase step-by-step and you'll have your app live in 1-2 hours! 🚀

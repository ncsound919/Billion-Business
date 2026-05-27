# Deployment Options Guide

This guide covers deployment options for the Billion Business Grader app.

## Architecture Overview

The app consists of:
- **Frontend:** React + Vite (SPA)
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL (via Supabase)
- **Auth:** GitHub OAuth + JWT

---

## Option 1: Vercel (Frontend) + Railway (Backend) ⭐ RECOMMENDED

This is the **easiest and most cost-effective** for most teams.

### Frontend on Vercel

#### 1.1 Prepare Frontend for Vercel
```bash
# Create vercel.json
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@vite_api_url"
  }
}
EOF
```

#### 1.2 Push to GitHub
```bash
git add vercel.json
git commit -m "chore: add Vercel configuration"
git push origin main
```

#### 1.3 Deploy to Vercel
1. Go to https://vercel.com
2. Click **Add New → Project**
3. Select your **Billion-Business** repo
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variable:
   - **VITE_API_URL** = `https://your-backend-domain.com` (Railway URL)
6. Click **Deploy**

#### 1.4 Update vite.config.ts
```typescript
// In vite.config.ts, ensure this exists:
import.meta.env.VITE_API_URL || 'http://localhost:3000'
```

---

### Backend on Railway ⭐ RECOMMENDED

Railway is perfect for Node.js apps with databases.

#### 2.1 Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Create a new project

#### 2.2 Add PostgreSQL
1. In Railway dashboard, click **Add Plugin**
2. Select **PostgreSQL**
3. Click **Create**

#### 2.3 Deploy Backend
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway link

# Add environment variables
railway variables set DATABASE_URL=<from supabase>
railway variables set GITHUB_TOKEN=<your-token>
railway variables set GEMINI_API_KEY=<your-key>
railway variables set STRIPE_SECRET_KEY=<your-key>
railway variables set FRONTEND_URL=https://your-vercel-domain.com

# Deploy
railway up
```

#### 2.4 Get Backend URL
1. In Railway dashboard, go to your service
2. Copy the **Public URL** (e.g., `https://grader-prod.up.railway.app`)
3. Update Vercel `VITE_API_URL` with this

---

## Option 2: Render.com (Full Stack Alternative)

Render is similar to Railway, great for full-stack apps.

### 2.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### 2.2 Deploy Service
1. Click **New → Web Service**
2. Select your GitHub repo
3. Configure:
   - **Name:** grader-prod
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Choose based on needs
4. Add environment variables (same as Railway)
5. Click **Create Web Service**

### 2.3 Connect PostgreSQL
1. Click **New → PostgreSQL**
2. Once created, copy `DATABASE_URL`
3. Add to your web service environment variables

---

## Option 3: Fly.io (Advanced)

Fly.io uses Docker containers for global deployment.

### 3.1 Create Fly.io Account
```bash
npm install -g flyctl
flyctl auth signup
```

### 3.2 Generate Fly.io Config
```bash
flyctl apps create grader-prod

# This creates fly.toml
# Edit it to match Docker setup
```

### 3.3 Deploy
```bash
flyctl deploy
```

---

## Option 4: Docker + Traditional Hosting

For AWS EC2, DigitalOcean, Hetzner, etc.

### 4.1 Build Docker Image
```bash
docker build -t grader:latest .
```

### 4.2 Push to Docker Hub
```bash
docker login
docker tag grader:latest username/grader:latest
docker push username/grader:latest
```

### 4.3 Deploy to Cloud VM
```bash
# SSH into your server
ssh root@your-server-ip

# Pull image
docker pull username/grader:latest

# Create .env file with secrets
cat > .env << 'EOF'
DATABASE_URL=...
GITHUB_TOKEN=...
GEMINI_API_KEY=...
STRIPE_SECRET_KEY=...
FRONTEND_URL=https://yourdomain.com
EOF

# Run container
docker run -d --name grader \
  --env-file .env \
  -p 3000:3000 \
  username/grader:latest

# Set up Nginx reverse proxy (optional)
# Set up SSL with Let's Encrypt (recommended)
```

---

## Comparison Table

| Option | Cost | Setup Time | Complexity | Best For |
|--------|------|-----------|-----------|----------|
| **Vercel + Railway** | ~$15-50/mo | 30 min | Low | Growth-focused teams |
| **Render** | ~$15-50/mo | 30 min | Low | Simplicity |
| **Fly.io** | ~$5-20/mo | 45 min | Medium | Global reach |
| **Docker + EC2** | ~$10-100/mo | 1-2 hr | High | Full control |
| **Vercel + Serverless** | $0-20/mo | 2-3 hr | Very High | Micro-services |

---

## Environment Variables Checklist

All deployment options need these:

```
DATABASE_URL=postgresql://...
GITHUB_TOKEN=ghp_...
GEMINI_API_KEY=AIza...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
PORT=3000
```

---

## Post-Deployment Checklist

After deploying to your chosen platform:

- [ ] Test `/healthz` endpoint returns healthy
- [ ] Test `/readyz` endpoint returns ready
- [ ] Verify database connection works
- [ ] Test GitHub OAuth flow
- [ ] Test Stripe webhook delivery
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring/alerts
- [ ] Configure auto-scaling (if available)
- [ ] Set up log aggregation
- [ ] Create backup strategy

---

## Domain Configuration

1. **Buy domain** at Namecheap, GoDaddy, or your registrar
2. **Point to your platform:**
   - **Vercel:** Update nameservers (Vercel provides these)
   - **Railway/Render:** Add CNAME record to your platform
   - **Custom DNS:** Add A record pointing to server IP

3. **Enable SSL:**
   - Most platforms handle this automatically
   - If manual: use Let's Encrypt certbot

4. **Update environment variable:**
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

---

## Recommended Path for Deployment

**For fastest deployment (30 minutes):**
1. ✅ Database: Use Supabase (already set up)
2. ✅ Frontend: Deploy to Vercel
3. ✅ Backend: Deploy to Railway
4. ✅ Domain: Point to Vercel (handles frontend)
5. ✅ Stripe: Configure webhook for your backend URL

**Total cost:** ~$30-50/month for production-grade setup

---

## Quick Start: Vercel + Railway

```bash
# 1. Setup Railway backend (5 min)
railway login
railway link
railway variables set DATABASE_URL=...
railway variables set GITHUB_TOKEN=...
railway up

# 2. Get Railway URL
# Copy the public URL from Railway dashboard

# 3. Update code
vercel env add VITE_API_URL <railway-url>

# 4. Deploy to Vercel
vercel deploy --prod

# 5. Done! Your app is live
```

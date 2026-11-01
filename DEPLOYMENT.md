# CampusConnect — Railway Deployment & CD Pipeline Guide

**Project:** CampusConnect (Smart Campus Exchange)  
**Platform:** Railway (Native Cloud Deployment)  
**DevOps & Infrastructure:** Deep Boghara (DB)

---

## 🏗️ How Railway Works (No Docker Needed!)

Railway uses **Nixpacks** (its automatic zero-config build engine). It inspects your repository and automatically:
* **`backend/`**: Detects `package.json` ➔ runs `npm install` ➔ starts with `npm start`.
* **`ai/`**: Detects `requirements.txt` ➔ installs Python packages ➔ starts with `python -m uvicorn main:app`.
* **`Frontend/`**: Detects Vite/React ➔ runs `npm run build` ➔ serves the web application.
* **`Redis`**: Provisioned with 1 click directly in the Railway dashboard.

---

## 🚀 The Automated Continuous Deployment (CD) Pipeline

Whenever code is pushed or merged to `main`:

```
[Push to main] ➔ [GitHub Actions Quality Gate] ➔ [Automated Railway Deploy]
```

1. **Quality Gate:** GitHub Actions runs all 64 backend cross-module tests and verifies Python AI syntax.
2. **Deploy Stage:** If all tests pass, GitHub Actions signals Railway to build and roll out the latest deployment.

---

## 📋 When You Are Ready to Deploy Live (The 2 Small Steps)

When your project is ready for the first live deployment:

### Step 1: Connect Repo in Railway
1. Open [Railway.app](https://railway.app) and sign in with GitHub.
2. Click **+ New Project** ➔ **Deploy from GitHub repo** ➔ Select `CampusConnect`.
3. Set root directories for each service:
   * **Backend**: Root Directory = `/backend`
   * **AI Microservice**: Root Directory = `/ai`
   * **Frontend**: Root Directory = `/Frontend`
4. Click **+ New** ➔ **Database** ➔ **Add Redis**.
5. Copy environment variables from `.env.production.example` into each service.

### Step 2: Add Railway Token to GitHub Secrets
1. In Railway: **Project Settings** ➔ **Tokens** ➔ **Create Project Token** (Copy it).
2. In GitHub (`CampusConnect` repository):
   **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ **New repository secret**.
3. Name: `RAILWAY_TOKEN`  
   Value: *(Paste the token)*

Done! From that moment on, every push to `main` automatically tests and deploys to Railway.

# Deployment Guide

This guide explains how to deploy the ERP system to various platforms.

## Prerequisites

- MongoDB Atlas account (for database)
- Git repository with the code
- Platform account (Render or Zeabur)

## Deployment Platform Options

### Option 1: Zeabur (Recommended - No Cooldown)

Zeabur is recommended because it has no cooldown/sleep issues on the free tier.

#### 1. Prepare Environment Variables

**Backend Environment Variables:**
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT token signing
- `NODE_ENV`: Set to `production`
- `ZEABUR`: Set to `true` (for CORS configuration)

**Frontend Environment Variables:**
- `REACT_APP_API_URL`: Use backend service name (e.g., `http://backend:5000/api`)

#### 2. Deploy on Zeabur

1. Go to [Zeabur Dashboard](https://zeabur.com/dashboard)
2. Create a new project
3. Connect your Git repository

**Deploy Backend:**
1. Click "Add Service" → "Git"
2. Select your repository
3. Set root directory to `backend`
4. Zeabur will auto-detect Node.js and use `zbpack.json` configuration
5. Add environment variables from `.env.example`
6. Deploy

**Deploy Frontend:**
1. Click "Add Service" → "Git"
2. Select your repository
3. Set root directory to `frontend`
4. Zeabur will auto-detect React and use `zbpack.json` configuration
5. Add `REACT_APP_API_URL` environment variable
6. Deploy

#### 3. Service Communication

Zeabur provides automatic private networking between services:
- Frontend can access backend using service name: `http://backend:5000/api`
- No need for public URLs for service-to-service communication

### Option 2: Render (Has Cooldown on Free Tier)

Note: Render's free tier has a cooldown/sleep period for inactive services. Consider using Zeabur instead to avoid this issue.

#### Preventing Cooldown with Keep-Alive Service

To prevent your Render services from sleeping, you can use a free uptime monitoring service like UptimeRobot:

1. Go to [UptimeRobot](https://uptimerobot.com/) and create a free account
2. Click "Add New Monitor"
3. Configure:
   - **Monitor Type**: HTTP(s)
   - **Monitor Name**: Your backend service name
   - **URL**: Your backend health endpoint (e.g., `https://your-backend.onrender.com/api/health`)
   - **Monitoring Interval**: 5 minutes (recommended to prevent sleep)
4. Click "Create Monitor"

This will ping your backend every 5 minutes, keeping it awake and preventing the cooldown issue.

#### Backend Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: Add all variables from `.env.example`
5. Click "Deploy Web Service"

#### Frontend Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` (for static site) or use `serve -s build`
   - **Environment Variables**: Add `REACT_APP_API_URL` with your backend URL
5. Click "Deploy Web Service"

## MongoDB Setup

### 1. Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with username and password
4. Whitelist IP addresses (use 0.0.0.0/0 for cloud platforms)

### 2. Get Connection String

1. In MongoDB Atlas, click "Connect" → "Connect your application"
2. Copy the connection string
3. Replace `<password>` with your actual password
4. Use this as `MONGODB_URI` in platform environment variables

## Post-Deployment Checklist

- [ ] Backend is accessible at its platform URL
- [ ] Frontend can connect to backend API
- [ ] User registration and login work
- [ ] Database operations work correctly
- [ ] All pages load without errors
- [ ] Responsive design works on mobile devices

## Troubleshooting

### Backend Issues

- **Database connection error**: Check `MONGODB_URI` is correct and IP is whitelisted (0.0.0.0/0)
- **Port already in use**: Platforms handle port automatically, don't set PORT manually
- **Build fails**: Check all dependencies are in package.json
- **CORS errors**: Ensure CORS configuration allows your frontend domain

### Frontend Issues

- **API connection error**: Verify `REACT_APP_API_URL` matches backend URL/service name
- **Blank page**: Check build logs for errors
- **Environment variables not working**: Ensure variables are prefixed with `REACT_APP_`

### Zeabur-Specific Issues

- **Service communication error**: Ensure services are in the same project
- **Private networking not working**: Check service names are correct in environment variables
- **Build timeout**: Check if `zbpack.json` commands are correct

## Local Development

To run locally:

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your local settings
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env
# Edit .env with http://localhost:5000/api
npm start
```

## Cost

### Zeabur (Recommended)
- Zeabur Free Tier: $0/month (no cooldown, generous limits)
- MongoDB Atlas Free Tier: $0/month (512MB storage)
- Total cost: $0/month for basic usage

### Render
- Render Free Tier: $0/month (with cooldown/sleep limitations)
- MongoDB Atlas Free Tier: $0/month (512MB storage)
- Total cost: $0/month for basic usage (with potential cooldown issues)

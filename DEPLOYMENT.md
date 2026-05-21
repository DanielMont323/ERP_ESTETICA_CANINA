# Deployment Guide for Render

This guide explains how to deploy the ERP system to Render.

## Prerequisites

- MongoDB Atlas account (for database)
- Render account (free tier available)
- Git repository with the code

## Backend Deployment

### 1. Prepare Environment Variables

Copy `backend/.env.example` to your actual environment variables in Render:

Required variables:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT token signing
- `PORT`: Render sets this automatically, but you can set it to 5000
- `NODE_ENV`: Set to `production`

### 2. Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: Add all variables from `.env.example`
5. Click "Deploy Web Service"

### 3. Note the Backend URL

After deployment, Render will provide a URL like:
`https://your-backend-name.onrender.com`

Copy this URL for the frontend configuration.

## Frontend Deployment

### 1. Prepare Environment Variables

Copy `frontend/.env.example` to your actual environment variables in Render:

Required variable:
- `REACT_APP_API_URL`: Your backend URL from step 3 (e.g., `https://your-backend-name.onrender.com/api`)

### 2. Deploy Frontend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` (for static site) or use `serve -s build`
   - **Environment Variables**: Add `REACT_APP_API_URL`
5. Click "Deploy Web Service"

### Alternative: Deploy as Static Site

For better performance, deploy the frontend as a static site:

1. Build locally: `cd frontend && npm run build`
2. Upload the `build` folder to Render Static Site
3. Or use the "Static Site" option in Render with:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

## MongoDB Setup

### 1. Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with username and password
4. Whitelist IP addresses (use 0.0.0.0/0 for Render)

### 2. Get Connection String

1. In MongoDB Atlas, click "Connect" → "Connect your application"
2. Copy the connection string
3. Replace `<password>` with your actual password
4. Use this as `MONGODB_URI` in Render environment variables

## Post-Deployment Checklist

- [ ] Backend is accessible at its Render URL
- [ ] Frontend can connect to backend API
- [ ] User registration and login work
- [ ] Database operations work correctly
- [ ] All pages load without errors
- [ ] Responsive design works on mobile devices

## Troubleshooting

### Backend Issues

- **Database connection error**: Check `MONGODB_URI` is correct and IP is whitelisted
- **Port already in use**: Render handles port automatically, don't set PORT manually
- **Build fails**: Check all dependencies are in package.json

### Frontend Issues

- **API connection error**: Verify `REACT_APP_API_URL` matches backend URL
- **Blank page**: Check build logs for errors
- **CORS errors**: Ensure backend CORS allows frontend domain

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

- Render Free Tier: $0/month (with limitations)
- MongoDB Atlas Free Tier: $0/month (512MB storage)

Total cost: $0/month for basic usage.

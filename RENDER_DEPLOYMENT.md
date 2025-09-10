# WemaTrust Banking App - Render Deployment Guide

This guide will help you deploy the WemaTrust Banking App to Render for free.

## 🚀 Quick Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to a GitHub repository with the following files:
- `package.json` (updated with production scripts)
- `render.yaml` (Render configuration)
- `.env.example` (environment variables template)
- All source code files

### 2. Deploy to Render

1. **Go to [Render.com](https://render.com)** and sign up/login
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `wematrust-banking` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

5. **Set Environment Variables:**
   - `NODE_ENV` = `production`
   - `NEXT_PUBLIC_BASE_URL` = `https://your-app-name.onrender.com` (replace with your actual URL)

6. **Click "Create Web Service"**

### 3. Wait for Deployment

- Render will automatically build and deploy your app
- The first deployment may take 5-10 minutes
- You'll get a URL like: `https://wematrust-banking.onrender.com`

## 🔧 Configuration Details

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Tells the app it's running in production |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.onrender.com` | Your app's public URL |

### Database Configuration

The app uses an in-memory database in production that:
- ✅ **Works on Render** (no file system dependencies)
- ✅ **Persists data** during the session
- ✅ **Resets on restart** (expected behavior for free tier)
- ✅ **Includes sample data** (users, accounts, prefunded accounts)

### Free Tier Limitations

- **Sleep after 15 minutes** of inactivity
- **Cold start** takes ~30 seconds when waking up
- **Data resets** when the service restarts
- **Perfect for demos** and testing

## 🎯 Features That Work on Render

### ✅ Fully Functional Features

1. **User Authentication** - Login/logout system
2. **Account Management** - View balances and account details
3. **Instant Transfers** - Send money between users
4. **Transaction History** - View all transactions
5. **Admin Dashboard** - Monitor system health and logs
6. **Prefunded Accounts** - Track liquidity pools
7. **Partner Bank Status** - Monitor bank connectivity
8. **Real-time Updates** - Live balance and transaction updates

### 🔄 How Transfers Work

1. **Instant Credit** - Recipient is credited immediately
2. **Backend Settlement** - Simulated 3-second settlement
3. **Transfer Logs** - Complete audit trail
4. **Admin Monitoring** - Real-time dashboard updates

## 🧪 Testing Your Deployment

### Test Users (Available after deployment)

1. **Demo User 1**
   - Account: `0123456789`
   - Balance: ₦100,000
   - Login: Click "Demo User 1" on login page

2. **Demo User 2**
   - Account: `9876543210`
   - Balance: ₦50,000
   - Login: Click "Demo User 2" on login page

3. **Admin User**
   - Account: `0000000000`
   - Balance: ₦1,000,000
   - Access: Admin dashboard at `/admin`

### Test Scenarios

1. **Basic Transfer**: Send ₦5,000 from User 1 to User 2
2. **Admin Dashboard**: Visit `/admin` to see transfer logs
3. **Balance Updates**: Verify balances update immediately
4. **Transaction History**: Check transaction appears in history

## 🛠️ Troubleshooting

### Common Issues

1. **App won't start**
   - Check build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify `NEXT_PUBLIC_BASE_URL` is set correctly

2. **Transfers not working**
   - Check browser console for errors
   - Verify API endpoints are responding
   - Ensure database is initialized

3. **Data resets**
   - This is normal for free tier
   - Data persists during active sessions
   - Consider upgrading to paid plan for persistence

### Debug Commands

```bash
# Check if app is running
curl https://your-app.onrender.com

# Check API endpoints
curl https://your-app.onrender.com/api/admin/logs
curl https://your-app.onrender.com/api/accounts?userId=user1
```

## 📊 Monitoring

### Render Dashboard
- **Metrics**: CPU, Memory, Response Time
- **Logs**: Real-time application logs
- **Deployments**: Build and deployment history

### Application Logs
- **Transfer Logs**: All transfer activities
- **System Health**: Partner bank status
- **Admin Dashboard**: Real-time monitoring

## 🎉 Success!

Once deployed, your WemaTrust Banking App will be live at:
`https://your-app-name.onrender.com`

**Features to showcase:**
- ✅ Instant transfers between users
- ✅ Real-time balance updates
- ✅ Admin dashboard with transfer logs
- ✅ Prefunded account monitoring
- ✅ Partner bank status tracking

The app demonstrates a complete "Credit First, Settle Later" banking system that provides instant transfers while maintaining backend settlement tracking.

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [WemaTrust App](https://your-app.onrender.com) (your deployed URL)

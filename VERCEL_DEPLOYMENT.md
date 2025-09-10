# 🚀 Vercel Deployment Guide

## Quick Deploy (Recommended)

### Option 1: Deploy with Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? wematrust-banking
# - Directory? ./
# - Override settings? No
```

### Option 2: Deploy with GitHub Integration
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js and configure everything

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app
NODE_ENV=production
DATABASE_TYPE=file
```

## Important Notes

### ✅ What Works on Vercel:
- **Frontend**: All React components and pages
- **API Routes**: All `/api/*` endpoints work perfectly
- **File Database**: Data persists in Vercel's filesystem
- **Real-time Updates**: SSE events work
- **Authentication**: Login system works
- **Transfers**: Complete transfer functionality

### ⚠️ Limitations:
- **File Persistence**: Data resets on serverless function cold starts
- **Serverless Functions**: 10-second timeout on Hobby plan
- **Storage**: Temporary filesystem (not permanent)

### 🔧 For Production Use:
Consider upgrading to:
- **Vercel Pro**: Longer function timeouts
- **External Database**: PostgreSQL, MongoDB, etc.
- **Vercel Storage**: For persistent data

## Testing Your Deployment

1. **Visit your Vercel URL**: `https://your-app-name.vercel.app`
2. **Test Login**: Use demo users (user1, user2)
3. **Test Transfers**: Send money between accounts
4. **Check API**: Visit `/api/accounts` to see data

## Troubleshooting

### Build Errors:
```bash
# Check build locally
npm run build

# Fix TypeScript errors
npm run typecheck
```

### API Issues:
- Check Vercel Function logs
- Verify environment variables
- Test API endpoints directly

### Database Issues:
- File-based DB works but resets on cold starts
- Consider external database for production

## Success! 🎉

Your banking app is now live on Vercel with:
- ✅ Complete frontend and backend
- ✅ Real-time transfers
- ✅ User authentication
- ✅ Transaction history
- ✅ Partner bank monitoring

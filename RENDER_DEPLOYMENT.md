# WemaTrust Banking App - Render Deployment

## Quick Deploy to Render

1. **Fork/Clone this repository**
2. **Go to [render.com](https://render.com)**
3. **Create a new Web Service**
4. **Connect your GitHub repository**
5. **Configure the service:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Node Version**: `18.x`

## Environment Variables

Set these in Render Dashboard:
- `NODE_ENV=production`
- `DATABASE_TYPE=file`

## Build Issues

If you encounter module resolution issues:

1. **Check Node Version**: Ensure you're using Node 18+
2. **Clear Build Cache**: Try rebuilding without cache
3. **Check Dependencies**: Ensure all packages are installed

## Expected Results

- ✅ **Persistent Data**: Transfers will persist across restarts
- ✅ **No Cold Starts**: App stays running continuously  
- ✅ **Shared Database**: All requests use same instance
- ✅ **File Storage**: Database file persists on disk

## Troubleshooting

### Module Resolution Errors
If you see "Can't resolve '@/components/ui/card'" errors:

1. **Check tsconfig.json**: Ensure paths are configured correctly
2. **Verify Components**: Make sure all UI components exist
3. **Clear Cache**: Try rebuilding from scratch

### Database Issues
If transfers don't persist:

1. **Check Environment**: Ensure `DATABASE_TYPE=file`
2. **Verify Permissions**: Ensure write access to file system
3. **Check Logs**: Look for database initialization errors

## Support

If you encounter issues, check:
- Render build logs
- Application logs
- Environment variables
- Node.js version compatibility

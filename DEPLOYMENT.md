# Vercel Deployment Guide

## Frontend Setup

The frontend is hosted on Vercel at: `https://cantonese-opera-calendar-git-main-kawaii2025s-projects.vercel.app/`

### Environment Variables

Set the following environment variables in your Vercel project settings:

- **VITE_API_URL**: Your backend API URL (e.g., `https://your-backend.com`)

### Deployment

The frontend automatically deploys on every push to the `main` branch via Vercel's GitHub integration.

### Local Development

```bash
npm install
npm run dev
```

Default development API: `http://localhost:3001`

### Production Build

```bash
npm run build
```

The build output is in the `dist/` directory.

## Backend Setup

The backend can be deployed separately. Make sure to:

1. Set `CORS_ORIGINS` to include your Vercel frontend URL:
   ```
   CORS_ORIGINS=https://cantonese-opera-calendar-git-main-kawaii2025s-projects.vercel.app,http://localhost:5173,http://localhost:3000
   ```

2. Set your `DATABASE_URL` to your Neon PostgreSQL connection string

3. Update the frontend's `VITE_API_URL` to point to your deployed backend

## Production Workflow

1. **Backend**: Deploy to your hosting platform (Railway, Render, etc.)
2. **Frontend**: Set `VITE_API_URL` env var in Vercel project settings
3. **Push**: Changes to main branch auto-deploy both services

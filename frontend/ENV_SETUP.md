# API Configuration Guide

To ensure your Frontend connects to your Backend in all environments, follow these steps.

## 1. Local Development
By default, the app tries to connect to `http://localhost:4000`. 

If you need to change this (e.g., different port), create variables in `.env.local`:

```bash
# file: frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 2. Production (Netlify + Cloudflare Tunnel)
In production, your frontend is on Netlify, and your backend is likely behind a Cloudflare Tunnel.

1.  **Get your Cloudflare Tunnel URL** (e.g., `https://api-finance.yourdomain.com`).
2.  **Go to Netlify Dashboard** > Site Settings > Environment Variables.
3.  Add a new variable:
    *   **Key**: `NEXT_PUBLIC_API_URL`
    *   **Value**: `https://api-finance.yourdomain.com` (Use the actual URL)

## 3. Verification
When you load the app, open the Browser Console (F12). You should see:
> `[API] Connected to: ...`

If it says `/backend-api`, it means no variable was found and it defaulted to proxy mode (which works if you have an Nginx proxy setup, but for pure Netlify, you MUST set the URL).

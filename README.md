# DailyNexa Backend (Free Stack)

Daily Key Authentication API for the modified MobiOffice APK.

## Stack
- Node.js + Express
- MongoDB Atlas Free (M0)
- Deploy on Render.com Free Tier
- Timezone forced to **Asia/Kolkata**

## Quick Start (Local)

1. Copy `.env.example` → `.env` and fill values
2. `npm install`
3. `npm start`

## Deploy on Render (Free)

1. Create a new **Web Service** on Render
2. Connect your GitHub repo (or deploy from this folder)
3. Environment variables to set:
   - `MONGODB_URI` → your Atlas connection string
   - `ADMIN_PASSWORD` → strong password
   - `JWT_SECRET` → long random string
   - `NODE_ENV=production`
4. Start command: `npm start`
5. Free tier will sleep after ~15 min inactivity (first request may take 30-50s)

## Admin Dashboard

After deployment open:

**https://your-api.onrender.com/admin**

Login with the `ADMIN_PASSWORD` you set in environment variables.

Features:
- View / Generate / Revoke today's key
- Statistics (success / fail / active sessions)
- Recent keys table
- Activity logs

## Important Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/server-time` | Current server time + date |
| POST | `/api/auth/verify-key` | Verify daily key |
| POST | `/api/admin/login` | Get admin JWT |
| POST | `/api/admin/generate-key` | Create today's key |
| POST | `/api/admin/revoke-key` | Revoke a key |
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/keys` | List keys |
| GET | `/api/admin/logs` | Recent logs |
| GET | `/admin` | Admin Dashboard UI |

## Device Binding
Default `maxDevices = 1`. First successful verification registers the installationId.

## Notes
- Never put real secrets in the APK or frontend JavaScript.
- Rate limited: 15 verify attempts per IP per hour.
- All dates/times use Asia/Kolkata.

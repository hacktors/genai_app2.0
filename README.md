# LEDGER.AI

AI-powered expense tracker with:
- React + Vite frontend
- Express + MongoDB backend
- JWT authentication
- Gemini-based receipt parsing
- Vercel-ready frontend/API routing

## Project Structure

```text
.
|-- backend
|-- frontend
|-- vercel.json
|-- .env.example
`-- .env.production.example
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas or local MongoDB
- Google Gemini API key

## Local Setup

1. Create env files:
```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.development.example frontend\.env.development
```

2. Fill `.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ledger_ai
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=replace-with-your-google-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

3. Fill `frontend/.env.development`:
```env
VITE_BACKEND_URL=http://localhost:5000
```

4. Install dependencies:
```powershell
npm run install:all
```

5. Start backend:
```powershell
npm run dev:backend
```

6. Start frontend in a second terminal:
```powershell
npm run dev:frontend
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`

## Upload Behavior

Receipt files are processed in memory and sent to Gemini for extraction. This keeps the deployment simple and avoids external file-storage setup, but uploaded files are not persisted after request processing.

## Vercel Deployment

Import the repo in Vercel with the repository root as the project root. The included [vercel.json](./vercel.json) routes `/api/*` to the backend and everything else to the built frontend.

Set these environment variables in Vercel:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-project.vercel.app
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ledger_ai
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=replace-with-your-google-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

Notes:
- Do not set `PORT` manually on Vercel.
- `VITE_BACKEND_URL` is not required in production because the frontend uses same-origin `/api` requests.

## Production Checklist

- Use a strong `JWT_SECRET`
- Restrict `CLIENT_ORIGIN` to your real frontend domain
- Ensure MongoDB network access allows Vercel
- Add your deployed Vercel domain to MongoDB Atlas allowlists if required
- Verify `/api/health` after deploy

More environment details are in [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md).

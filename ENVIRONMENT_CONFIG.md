# Environment Configuration Guide

This project uses a root backend env file plus frontend Vite env files.

## Files

```text
project-root/
|-- .env
|-- .env.example
|-- .env.production.example
|-- backend/
`-- frontend/
    |-- .env.development
    `-- .env.production.example
```

## Backend Variables

Defined in the root `.env` file:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Local only | Backend port for development |
| `NODE_ENV` | Yes | `development` or `production` |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin for CORS |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.0-flash` |

## Frontend Variables

Defined in `frontend/.env.development` for local work:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes for local dev | Vite proxy target for `/api` |

Example:

```env
VITE_BACKEND_URL=http://localhost:5000
```

## Local Development

Root `.env` example:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ledger_ai
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=replace-with-your-google-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

Commands:

```powershell
npm run install:all
npm run dev:backend
npm run dev:frontend
```

## Production and Vercel

Set these in Vercel Project Settings:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-project.vercel.app
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ledger_ai
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=replace-with-your-google-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

Notes:
- Vercel provides the runtime port automatically.
- The frontend does not need `VITE_BACKEND_URL` in production because requests go to same-origin `/api`.
- Uploaded files are handled in memory and are not stored permanently.

## Troubleshooting

Backend exits immediately:

- Check that `.env` exists in the project root.
- Verify `PORT` is set for local development.
- Verify `MONGO_URI` and `JWT_SECRET` are set.

Frontend cannot reach the API:

- Verify `frontend/.env.development` exists.
- Verify `VITE_BACKEND_URL` points to the backend port.
- Restart Vite after changing env files.

MongoDB connection errors:

- Check Atlas username and password
- Check the database IP/network allowlist
- Confirm the connection string is valid

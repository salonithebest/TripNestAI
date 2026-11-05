# TripNest AI

TripNest AI is a travel-planning app with account authentication, trip management, and ordered journey legs.

## Requirements

- Node.js 20 or newer
- A MongoDB connection string

## Configure the server

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `JWT_SECRET` to your own values. The checked-out `.env` is intentionally only a local placeholder and is ignored by Git.

If Node.js reports a DNS error resolving the MongoDB Atlas SRV record while Windows can resolve it, set `DNS_SERVER` in `server/.env` to the DNS server configured for your network. Otherwise leave it empty.

## Run locally

In one terminal:

```powershell
cd server
npm install
npm run dev
```

In another terminal:

```powershell
cd client
npm install
npm run dev
```

The Vite development server runs at <http://localhost:5173> and proxies `/api` requests to the backend at <http://localhost:5000>. The API health endpoint is <http://localhost:5000/api/health>.

## Validate

```powershell
cd server
npm run build
cd ..\client
npm run lint
npm run build
```

The current app implements authentication, train-only trip planning, ticket extraction and review, weather-aware packing recommendations, readiness scoring, and calendar export. Add a valid `GEMINI_API_KEY` in `server/.env` to enable ticket extraction and optional AI packing suggestions. Ticket upload returns an explicit configuration error if Gemini is unavailable; manual ticket entry remains available.

Ticket documents accept PDF, JPG, and PNG files up to 5 MB, or manually entered details. With `GEMINI_API_KEY` configured, the server sends the uploaded file to Gemini and validates the extracted fields before saving them for review. Review fields can be edited; **Save draft** keeps a document pending, and **Approve** marks it verified.

## Deployment

- Deploy `server` as a Node.js service using `npm install`, `npm run build`, and `npm start`. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `GEMINI_API_KEY` in the hosting provider's environment settings. Do not commit `.env` files.
- Deploy `client` to Vercel with the project root set to `client`, the build command `npm run build`, and the output directory `dist`. Set `VITE_API_URL` to the deployed API base URL ending in `/api` (for example, `https://api.example.com/api`). `client/vercel.json` rewrites client-side routes to `index.html`.
- Configure the API's `CLIENT_URL` to the deployed Vercel origin. The production frontend uses `VITE_API_URL`; the local Vite server proxies `/api` to `http://localhost:5000`.

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

The current app implements authentication, trip CRUD, journey-leg management, AI ticket extraction, packing recommendations, readiness scoring, and calendar export. Add a valid `GEMINI_API_KEY` in `server/.env` to enable AI extraction; the app falls back to a rule-based parser when it is not set.

Ticket documents accept PDF, JPG, and PNG files up to 5 MB, or manually entered details. With `GEMINI_API_KEY` configured, the server sends the uploaded file to Gemini and validates the extracted fields before saving them for review. Review fields can be edited; **Save draft** keeps a document pending, and **Approve** marks it verified.

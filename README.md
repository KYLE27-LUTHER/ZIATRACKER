# Guest & Godparent Manager — CockroachDB

This version replaces the browser-side Firebase/Firestore backend with a Node.js/Express API backed by CockroachDB.

## Why there is a server

A CockroachDB connection string contains database credentials and should not be embedded in a public HTML file. The browser now calls `/api/...`; `server.js` keeps `DATABASE_URL` private.

## Setup

1. Create a CockroachDB Cloud cluster and copy its connection string.
2. Create the tables by running `schema.sql` against the cluster.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your CockroachDB connection string.
4. Run:

```bash
npm install
npm start
```

5. Open `http://localhost:3000`.

The app preserves the existing `?syncKey=...` sharing mechanism. Guest records and invitation-card settings are stored in CockroachDB. Because this replacement no longer uses Firestore's realtime listener, the UI polls the API periodically to keep multiple devices synchronized.

CockroachDB Cloud provides PostgreSQL-compatible connection strings and can be used with standard PostgreSQL drivers such as `pg`. See the official CockroachDB developer resources for current connection guidance.

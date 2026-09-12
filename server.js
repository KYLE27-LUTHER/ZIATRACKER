const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());

// Serve static files (index.html)
app.use(express.static(path.join(__dirname, '.')));

// Database connection using DATABASE_URL env var on Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Setup CockroachDB Tables
pool.query(`
  CREATE TABLE IF NOT EXISTS guests (
    id STRING PRIMARY KEY,
    sync_key STRING,
    data JSONB
  );
  CREATE TABLE IF NOT EXISTS settings (
    sync_key STRING PRIMARY KEY,
    data JSONB
  );
`).catch(console.error);

// API Endpoints
app.get('/api/guests', async (req, res) => {
  const { syncKey } = req.query;
  const result = await pool.query('SELECT data FROM guests WHERE sync_key = $1', [syncKey]);
  res.json(result.rows.map(r => r.data));
});

app.put('/api/guests/:id', async (req, res) => {
  const { syncKey } = req.query;
  const { id } = req.params;
  const data = req.body;
  await pool.query(
    'INSERT INTO guests (id, sync_key, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $3',
    [id, syncKey, JSON.stringify(data)]
  );
  res.json({ ok: true });
});

app.delete('/api/guests/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM guests WHERE id = $1', [id]);
  res.json({ ok: true });
});

app.get('/api/card-settings', async (req, res) => {
  const { syncKey } = req.query;
  const result = await pool.query('SELECT data FROM settings WHERE sync_key = $1', [syncKey]);
  res.json(result.rows[0]?.data || null);
});

app.put('/api/card-settings', async (req, res) => {
  const { syncKey } = req.query;
  const data = req.body;
  await pool.query(
    'INSERT INTO settings (sync_key, data) VALUES ($1, $2) ON CONFLICT (sync_key) DO UPDATE SET data = $2',
    [syncKey, JSON.stringify(data)]
  );
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

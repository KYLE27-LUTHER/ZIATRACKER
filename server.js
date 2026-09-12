require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000
});

function requireSyncKey(req, res, next) {
  const key = String(req.query.syncKey || '').trim();
  if (!key || key.length > 200) return res.status(400).json({ error: 'syncKey is required' });
  req.syncKey = key;
  next();
}

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'CockroachDB' }); }
  catch (e) { res.status(503).json({ ok: false, error: 'Database unavailable' }); }
});

app.get('/api/guests', requireSyncKey, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, category, plus_ones AS "plusOnes",
             on_final_list AS "onFinalList", is_attending AS "isAttending",
             fee_paid AS "feePaid", data
      FROM guests WHERE sync_key = $1 ORDER BY updated_at, id`, [req.syncKey]);
    res.json(rows.map(r => ({ ...r.data, id: r.id, name: r.name, category: r.category,
      plusOnes: r.plusOnes, onFinalList: r.onFinalList, isAttending: r.isAttending, feePaid: r.feePaid })));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load guests' }); }
});

app.put('/api/guests/:id', requireSyncKey, async (req, res) => {
  const g = req.body || {};
  const id = String(req.params.id).trim();
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    await pool.query(`
      INSERT INTO guests (sync_key, id, name, category, plus_ones, on_final_list, is_attending, fee_paid, data, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
      ON CONFLICT (sync_key,id) DO UPDATE SET
        name=excluded.name, category=excluded.category, plus_ones=excluded.plus_ones,
        on_final_list=excluded.on_final_list, is_attending=excluded.is_attending,
        fee_paid=excluded.fee_paid, data=excluded.data, updated_at=now()`,
      [req.syncKey, id, String(g.name || ''), String(g.category || 'regular'),
       Number(g.plusOnes || 0), Boolean(g.onFinalList), Boolean(g.isAttending), Boolean(g.feePaid), JSON.stringify(g)]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save guest' }); }
});

app.delete('/api/guests/:id', requireSyncKey, async (req, res) => {
  try {
    await pool.query('DELETE FROM guests WHERE sync_key=$1 AND id=$2', [req.syncKey, req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete guest' }); }
});

app.get('/api/card-settings', requireSyncKey, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT settings FROM invitation_card_settings WHERE sync_key=$1', [req.syncKey]);
    res.json(rows[0]?.settings || null);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load card settings' }); }
});

app.put('/api/card-settings', requireSyncKey, async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO invitation_card_settings (sync_key, settings, updated_at)
      VALUES ($1,$2,now())
      ON CONFLICT (sync_key) DO UPDATE SET settings=excluded.settings, updated_at=now()`,
      [req.syncKey, JSON.stringify(req.body || {})]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save card settings' }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Invitation app running on port ${port}`));

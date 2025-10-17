import 'dotenv/config';


function readIdempotencyKey(req) {
const key = req.headers['idempotency-key'];
if (!key) throw new Error('Missing Idempotency-Key header');
return key;
}


// ===== Kiosk add =====
app.post('/api/credits/add', auth(['KIOSK','ADMIN']), writeLimiter, requireTimestamp, async (req, res) => {
const { error, value } = changeSchema.validate(req.body);
if (error) return res.status(400).json({ error: error.message });
const idempotencyKey = (()=>{ try { return readIdempotencyKey(req);} catch(e){ return null; }})();
if (!idempotencyKey) return res.status(400).json({ error: 'Missing Idempotency-Key header' });


const client = await pool.connect();
try {
await client.query('BEGIN');
const dup = await client.query('select id from requests where id=$1', [idempotencyKey]);
if (dup.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Duplicate request' }); }


const target = await getTargetByTokenOrUsername(client, value);
const updated = await client.query('update users set credits = credits + $1 where id=$2 returning credits', [value.amount, target.id]);
await client.query('insert into requests(id, actor_user_id, target_user_id, amount, kind) values($1,$2,$3,$4,$5)', [idempotencyKey, req.user.sub, target.id, value.amount, 'ADD']);
await client.query('COMMIT');
res.json({ success: true, credits: updated.rows[0].credits });
} catch (e) {
await client.query('ROLLBACK');
res.status(400).json({ error: e.message });
} finally { client.release(); }
});


// ===== Merchant deduct (never negative) =====
app.post('/api/credits/deduct', auth(['MERCHANT','ADMIN']), writeLimiter, requireTimestamp, async (req, res) => {
const { error, value } = changeSchema.validate(req.body);
if (error) return res.status(400).json({ error: error.message });
const idempotencyKey = (()=>{ try { return readIdempotencyKey(req);} catch(e){ return null; }})();
if (!idempotencyKey) return res.status(400).json({ error: 'Missing Idempotency-Key header' });


const client = await pool.connect();
try {
await client.query('BEGIN');
const dup = await client.query('select id from requests where id=$1', [idempotencyKey]);
if (dup.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Duplicate request' }); }


const target = await getTargetByTokenOrUsername(client, value);
const current = target.credits;
if (current < value.amount) throw new Error('Insufficient credits');
const updated = await client.query('update users set credits = credits - $1 where id=$2 returning credits', [value.amount, target.id]);
await client.query('insert into requests(id, actor_user_id, target_user_id, amount, kind) values($1,$2,$3,$4,$5)', [idempotencyKey, req.user.sub, target.id, value.amount, 'DEDUCT']);
await client.query('COMMIT');
res.json({ success: true, credits: updated.rows[0].credits });
} catch (e) {
await client.query('ROLLBACK');
res.status(400).json({ error: e.message });
} finally { client.release(); }
});


// Demo big button (USER) — no-op write
app.post('/api/big-button', auth(['USER']), requireTimestamp, async (req, res) => {
res.json({ success: true, at: new Date().toISOString() });
});


// Init schema (local dev)
if (process.argv.includes('--init')) {
initSchema()
.then(() => console.log('Schema initialized'))
.catch(err => { console.error(err); process.exit(1); })
.finally(() => process.exit(0));
}


const port = process.env.PORT || 3000;
app.listen(port, async () => {
try { await initSchema(); } catch (e) { console.error('Schema init error', e); }
console.log(`API listening on :${port}`);
});

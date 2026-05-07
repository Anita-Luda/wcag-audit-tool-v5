const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const DATA_DIR = path.join(__dirname, '../data/audits');

/* =====================================================
   UTILS
   ===================================================== */

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function auditDir(id) {
  return path.join(DATA_DIR, id);
}

function draftPath(id) {
  return path.join(auditDir(id), 'draft.json');
}

function metaPath(id) {
  return path.join(auditDir(id), 'meta.json');
}

function listVersions(id) {
  const dir = auditDir(id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /^v\d+\.json$/.test(f))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
}

/* =====================================================
   LIST AUDITS
   ===================================================== */

app.get('/api/audits', (req, res) => {
  ensureDir(DATA_DIR);

  const audits = fs.readdirSync(DATA_DIR).map(id => {
    const meta = fs.existsSync(metaPath(id))
      ? readJSON(metaPath(id))
      : {};
    return { id, ...meta };
  });

  res.json(audits);
});

/* =====================================================
   CREATE AUDIT
   ===================================================== */

app.post('/api/audits', (req, res) => {
  ensureDir(DATA_DIR);

  const id = `audit-${Date.now()}`;
  const dir = auditDir(id);
  ensureDir(dir);

  writeJSON(metaPath(id), {
    name: req.body.name || 'Nowy audyt',
    createdAt: new Date().toISOString()
  });

  writeJSON(draftPath(id), req.body.initialState || {
    meta: {},
    criteria: {}
  });

  res.json({ id });
});

/* =====================================================
   GET / SAVE DRAFT (MUTABLE)
   ===================================================== */

app.get('/api/audits/:id/draft', (req, res) => {
  const file = draftPath(req.params.id);
  if (!fs.existsSync(file)) {
    return res.status(404).end();
  }
  res.json(readJSON(file));
});

app.post('/api/audits/:id/draft', (req, res) => {
  const file = draftPath(req.params.id);
  if (!fs.existsSync(auditDir(req.params.id))) {
    return res.status(404).end();
  }

  writeJSON(file, req.body);
  res.json({ status: 'saved' });
});

/* =====================================================
   CREATE NEW VERSION (IMMUTABLE)
   ===================================================== */

app.post('/api/audits/:id/versions', (req, res) => {
  const dir = auditDir(req.params.id);
  if (!fs.existsSync(dir)) {
    return res.status(404).end();
  }

  const versions = listVersions(req.params.id);
  const next = `v${versions.length + 1}`;
  const source = draftPath(req.params.id);

  if (!fs.existsSync(source)) {
    return res.status(400).json({ error: 'Brak wersji roboczej' });
  }

  writeJSON(path.join(dir, `${next}.json`), readJSON(source));
  res.json({ version: next });
});

/* =====================================================
   LIST / GET VERSIONS (READ-ONLY)
   ===================================================== */

app.get('/api/audits/:id/versions', (req, res) => {
  res.json(listVersions(req.params.id));
});

app.get('/api/audits/:id/versions/:version', (req, res) => {
  const file = path.join(
    auditDir(req.params.id),
    `${req.params.version}.json`
  );
  if (!fs.existsSync(file)) {
    return res.status(404).end();
  }
  res.json(readJSON(file));
});

/* =====================================================
   START SERVER
   ===================================================== */

app.listen(PORT, () => {
  console.log(`✅ Audit app running at http://localhost:${PORT}`);
});
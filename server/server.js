const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

/* =========================================================
   DATA ROOT
   ========================================================= */

const DATA_DIR = path.join(__dirname, '../data/audits');

/* =========================================================
   HELPERS
   ========================================================= */

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function write(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function auditPath(id) {
  if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
    throw new Error('Invalid audit id');
  }
  return path.join(DATA_DIR, id);
}

function draftFile(id) {
  return path.join(auditPath(id), 'draft.json');
}

function metaFile(id) {
  return path.join(auditPath(id), 'meta.json');
}

function versionsDir(id) {
  return auditPath(id);
}

/* =========================================================
   CANONICAL STATE
   ========================================================= */

function createEmptyState() {
  const now = new Date().toISOString();

  return {
    meta: {
      appName: '',
      productType: 'web',
      auditStartedAt: now,
      auditLastModifiedAt: now
    },
    criteria: {}
  };
}

/* =========================================================
   CORE BOOTSTRAP (GUARANTEED EXISTENCE)
   ========================================================= */

function ensureAudit(id) {
  const dir = auditPath(id);
  ensureDir(dir);

  const draft = draftFile(id);
  const meta = metaFile(id);

  if (!fs.existsSync(draft)) {
    write(draft, createEmptyState());
  }

  if (!fs.existsSync(meta)) {
    write(meta, {
      id,
      name: id,
      createdAt: new Date().toISOString()
    });
  }

  return {
    state: safeRead(draft),
    meta: safeRead(meta)
  };
}

/* =========================================================
   INIT ROOT
   ========================================================= */

ensureDir(DATA_DIR);

/* =========================================================
   GET ALL AUDITS
   ========================================================= */

app.get('/api/audits', (req, res) => {
  ensureDir(DATA_DIR);

  const audits = fs.readdirSync(DATA_DIR)
    .filter(name => fs.lstatSync(path.join(DATA_DIR, name)).isDirectory())
    .map(id => {
      const meta = safeRead(metaFile(id)) || {};
      return { id, ...meta };
    });

  res.json(audits);
});

/* =========================================================
   GET DRAFT (NO 404 ANYMORE)
   ========================================================= */

app.get('/api/audits/:id/draft', (req, res) => {
  try {
    const audit = ensureAudit(req.params.id);
    res.json(audit.state);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =========================================================
   CREATE AUDIT (OPTIONAL MANUAL)
   ========================================================= */

app.post('/api/audits', (req, res) => {
  ensureDir(DATA_DIR);

  const body = req.body || {};
  const requestedId = body.id;
  const requestedName = body.name;

  if (!requestedId || !/^[a-zA-Z0-9-_]+$/.test(requestedId)) {
    return res.status(400).json({ error: 'Invalid or missing audit id' });
  }

  const dir = auditPath(requestedId);
  if (fs.existsSync(dir)) {
    return res.status(409).json({ error: 'Audit already exists' });
  }

  ensureDir(dir);

  const state = body.state || createEmptyState();
  if (requestedName) {
    state.meta.appName = requestedName;
  }

  write(draftFile(requestedId), state);
  write(metaFile(requestedId), {
    id: requestedId,
    name: requestedName || requestedId,
    createdAt: new Date().toISOString()
  });

  res.json({ id: requestedId });
});

/* =========================================================
   SAVE DRAFT
   ========================================================= */

app.post('/api/audits/:id/draft', (req, res) => {
  try {
    const file = draftFile(req.params.id);

    ensureAudit(req.params.id);

    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid state' });
    }

    write(file, body);

    res.json({ status: 'saved' });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =========================================================
   VERSIONS
   ========================================================= */

function listVersions(id) {
  const dir = versionsDir(id);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => /^v\d+\.json$/.test(f))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
}

app.get('/api/audits/:id/versions', (req, res) => {
  try {
    ensureAudit(req.params.id);
    res.json(listVersions(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/audits/:id/versions', (req, res) => {
  try {
    const id = req.params.id;
    const dir = auditPath(id);

    ensureAudit(id);

    const versions = listVersions(id);
    const next = `v${versions.length + 1}`;

    const draft = safeRead(draftFile(id));

    write(path.join(dir, `${next}.json`), draft);

    res.json({ version: next });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/audits/:id/versions/:version', (req, res) => {
  try {
    const file = path.join(
      auditPath(req.params.id),
      `${req.params.version}.json`
    );

    const data = safeRead(file);

    if (!data) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(data);

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* =========================================================
   START
   ========================================================= */

ensureAudit('default');

app.listen(PORT, () => {
  console.log(`✅ Audit app running: http://localhost:${PORT}`);
});
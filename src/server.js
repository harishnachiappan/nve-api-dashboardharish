// src/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const connectDB = require('./db');          // must export a function that connects (e.g., mongoose.connect)
const cveRoutes = require('./routes/cves');
const { fullSync } = require('./services/ingest');
const { startScheduler, stopScheduler } = require('./scheduler'); // add stopScheduler if you can

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

// --- Basic hard fails & config checks ---
if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in environment. Set it in .env');
  process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Content Security Policy (browser-only; won’t affect server-to-server like Mongo/NVD)
app.use((req, res, next) => {
  // Allow same-origin assets & XHR to our API; adjust if you host API/FE on different origins
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'"
  );
  next();
});

// --- API routes ---
app.use('/api/cves', cveRoutes);

// --- Static frontend ---
app.use(express.static(FRONTEND_DIR));

app.get('/cves/list', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'cves-list.html'));
});

app.get('/cves/:id', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'cve-details.html'));
});

app.get('/about', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'about.html'));
});

app.get('/', (_req, res) => {
  res.redirect('/cves/list');
});

// --- Health endpoint (includes DB status) ---
let dbStatus = { connected: false, lastError: null };

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
});

// --- Error handler (last) ---
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Bootstrap with retry for Mongo, then start server ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connectWithRetry({
  uri,
  maxAttempts = 5,
  delayMs = 1500,
} = {}) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await connectDB(uri);
      dbStatus = { connected: true, lastError: null };
      console.log('✓ MongoDB connected');
      return;
    } catch (err) {
      dbStatus = { connected: false, lastError: err?.message || String(err) };
      console.error(
        `✗ MongoDB connection attempt ${attempt}/${maxAttempts} failed:`,
        err?.message || err
      );
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
}

async function seedIfEmpty() {
  const Cve = require('./models/Cve');
  const count = await Cve.countDocuments();
  if (count === 0) {
    console.log('No CVEs found, running initial seed (5 pages)...');
    await fullSync(5);
  } else {
    console.log(`Database has ${count} CVEs`);
  }
}

async function bootstrap() {
  // Ensure we use 127.0.0.1 for local to avoid IPv6 resolution quirks on Windows
  // Example .env: MONGODB_URI=mongodb://127.0.0.1:27017/nvd
  const mongoUri = process.env.MONGODB_URI;

  await connectWithRetry({ uri: mongoUri });

  // Seed if needed
  try {
    await seedIfEmpty();
  } catch (err) {
    console.error('Seeding failed:', err?.message || err);
    // Non-fatal: API can still run even if initial seed fails
  }

  // Start scheduler after DB is ready
  try {
    startScheduler();
  } catch (err) {
    console.error('Scheduler failed to start:', err?.message || err);
  }

  // Start HTTP server
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down...`);
    try {
      if (typeof stopScheduler === 'function') {
        await stopScheduler();
      }
      // If connectDB exposes a disconnect, you can call it here
      // e.g., await mongoose.connection.close();
    } catch (e) {
      console.error('Error during shutdown:', e);
    } finally {
      server.close(() => process.exit(0));
      // Force-exit if not closed in 5s
      setTimeout(() => process.exit(0), 5000).unref();
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err?.message || err);
  process.exit(1);
});

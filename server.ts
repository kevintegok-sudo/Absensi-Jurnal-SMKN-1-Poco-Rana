import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'pegawai'
  );
`);

// Migration: Add missing columns if they don't exist
try { db.exec("ALTER TABLE users ADD COLUMN nip TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN class_id INTEGER;"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS geolocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    latitude REAL,
    longitude REAL,
    radius INTEGER -- in meters
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'in', 'out'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    latitude REAL,
    longitude REAL,
    address TEXT,
    selfie TEXT, -- base64 image
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    class_id INTEGER,
    subject_id INTEGER,
    content TEXT,
    selfie TEXT,
    latitude REAL,
    longitude REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'sakit', 'izin'
    reason TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed default data
const seedAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!seedAdmin) {
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)").run("admin", "admin123", "Administrator", "admin");
}

const seedGuru = db.prepare("SELECT * FROM users WHERE username = ?").get("guru");
if (!seedGuru) {
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)").run("guru", "guru123", "Guru Contoh", "guru");
}

const seedGeo = db.prepare("SELECT * FROM geolocations").get();
if (!seedGeo) {
  db.prepare("INSERT INTO geolocations (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)").run("Sekolah", -6.2000, 106.8166, 100);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, name, role, nip FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah" });
    }
  });

  // Public: Geolocation for proximity check
  app.get("/api/geolocations", (req, res) => res.json(db.prepare("SELECT * FROM geolocations").all()));

  // Admin: User Management
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, username, name, role, nip FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users", (req, res) => {
    const { username, password, name, role, nip } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, name, role, nip) VALUES (?, ?, ?, ?, ?)").run(username, password, name, role, nip);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  });

  // Admin: Classes & Subjects
  app.get("/api/admin/classes", (req, res) => res.json(db.prepare("SELECT * FROM classes").all()));
  app.post("/api/admin/classes", (req, res) => {
    db.prepare("INSERT INTO classes (name) VALUES (?)").run(req.body.name);
    res.json({ success: true });
  });

  app.get("/api/admin/subjects", (req, res) => res.json(db.prepare("SELECT * FROM subjects").all()));
  app.post("/api/admin/subjects", (req, res) => {
    db.prepare("INSERT INTO subjects (name) VALUES (?)").run(req.body.name);
    res.json({ success: true });
  });

  // Admin: Geolocation
  app.get("/api/admin/geolocations", (req, res) => res.json(db.prepare("SELECT * FROM geolocations").all()));
  app.post("/api/admin/geolocations", (req, res) => {
    const { name, latitude, longitude, radius } = req.body;
    db.prepare("INSERT INTO geolocations (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)").run(name, latitude, longitude, radius);
    res.json({ success: true });
  });

  app.get("/api/admin/attendance", (req, res) => {
    const records = db.prepare(`
      SELECT a.*, u.name as user_name 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
    `).all();
    res.json(records);
  });

  app.get("/api/admin/journals", (req, res) => {
    const records = db.prepare(`
      SELECT j.*, u.name as user_name, c.name as class_name, s.name as subject_name
      FROM journals j
      JOIN users u ON j.user_id = u.id
      JOIN classes c ON j.class_id = c.id
      JOIN subjects s ON j.subject_id = s.id
      ORDER BY j.timestamp DESC
    `).all();
    res.json(records);
  });

  app.get("/api/admin/permissions", (req, res) => {
    const records = db.prepare(`
      SELECT p.*, u.name as user_name
      FROM permissions p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.timestamp DESC
    `).all();
    res.json(records);
  });

  // Attendance
  app.post("/api/attendance", (req, res) => {
    const { userId, type, latitude, longitude, address, selfie } = req.body;
    
    const existing = db.prepare(`
      SELECT type FROM attendance 
      WHERE user_id = ? AND type = ? AND date(timestamp) = date('now', 'localtime')
    `).get(userId, type);

    if (existing) {
      return res.status(400).json({ success: false, message: `Anda sudah melakukan absen ${type === 'in' ? 'masuk' : 'pulang'} hari ini.` });
    }

    db.prepare(`
      INSERT INTO attendance (user_id, type, latitude, longitude, address, selfie)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, type, latitude, longitude, address, selfie);

    res.json({ success: true });
  });

  // Journals
  app.post("/api/journals", (req, res) => {
    const { userId, classId, subjectId, content, selfie, latitude, longitude } = req.body;
    db.prepare(`
      INSERT INTO journals (user_id, class_id, subject_id, content, selfie, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, classId, subjectId, content, selfie, latitude, longitude);
    res.json({ success: true });
  });

  // Permissions
  app.post("/api/permissions", (req, res) => {
    const { userId, type, reason, fileUrl } = req.body;
    db.prepare(`
      INSERT INTO permissions (user_id, type, reason, file_url)
      VALUES (?, ?, ?, ?)
    `).run(userId, type, reason, fileUrl);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const todayAttendance = db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM attendance WHERE date(timestamp) = date('now', 'localtime')").get() as any;
    const pendingPermissions = db.prepare("SELECT COUNT(*) as count FROM permissions WHERE status = 'pending'").get() as any;
    
    res.json({
      totalUsers: totalUsers.count,
      todayAttendance: todayAttendance.count,
      pendingPermissions: pendingPermissions.count
    });
  });

  app.get("/api/attendance/history/:userId", (req, res) => {
    const { userId } = req.params;
    const records = db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? 
      ORDER BY timestamp DESC
      LIMIT 50
    `).all(userId);
    res.json(records);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

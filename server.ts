import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";

const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'Guru'
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'in' or 'out'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    latitude REAL,
    longitude REAL,
    photo TEXT, -- base64
    location_tag TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    class_name TEXT,
    subject_name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    latitude REAL,
    longitude REAL,
    photo TEXT, -- base64
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    reason TEXT,
    start_date TEXT,
    end_date TEXT,
    attachment TEXT, -- base64
    status TEXT DEFAULT 'Pending',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Initialize Settings
const schoolLat = db.prepare("SELECT value FROM settings WHERE key = 'school_lat'").get();
if (!schoolLat) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('school_lat', '-8.5833');
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('school_lng', '120.4667');
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('school_radius', '100');
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('start_time', '07:00');
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('end_time', '14:00');
}

// Seed Classes and Subjects if empty
const classCount = db.prepare("SELECT COUNT(*) as count FROM classes").get() as any;
if (classCount.count === 0) {
  ['X RPL', 'XI RPL', 'XII RPL'].forEach(c => db.prepare("INSERT INTO classes (name) VALUES (?)").run(c));
}
const subjectCount = db.prepare("SELECT COUNT(*) as count FROM subjects").get() as any;
if (subjectCount.count === 0) {
  ['Matematika', 'Bahasa Indonesia', 'Produktif RPL'].forEach(s => db.prepare("INSERT INTO subjects (name) VALUES (?)").run(s));
}

// Seed Admin if not exists
const admin = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!admin) {
  db.prepare("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)").run(
    "admin",
    "admin123",
    "Administrator SMKN 1 Poco Ranaka",
    "Admin"
  );
} else if (admin.role === 'admin') {
  // Migration: Update old 'admin' role to 'Admin'
  db.prepare("UPDATE users SET role = 'Admin' WHERE role = 'admin'").run();
  db.prepare("UPDATE users SET role = 'Guru' WHERE role = 'user'").run();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Auth Endpoints
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json({ success: true, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah" });
    }
  });

  // Attendance Endpoints
  app.post("/api/attendance", (req, res) => {
    const { user_id, type, latitude, longitude, photo, location_tag } = req.body;
    db.prepare("INSERT INTO attendance (user_id, type, latitude, longitude, photo, location_tag) VALUES (?, ?, ?, ?, ?, ?)").run(
      user_id, type, latitude, longitude, photo, location_tag
    );
    res.json({ success: true });
  });

  // Journal Endpoints
  app.post("/api/journals", (req, res) => {
    const { user_id, content, class_name, subject_name, latitude, longitude, photo } = req.body;
    db.prepare("INSERT INTO journals (user_id, content, class_name, subject_name, latitude, longitude, photo) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      user_id, content, class_name, subject_name, latitude, longitude, photo
    );
    res.json({ success: true });
  });

  // Permission Endpoints
  app.post("/api/permissions", (req, res) => {
    const { user_id, reason, start_date, end_date, attachment } = req.body;
    db.prepare("INSERT INTO permissions (user_id, reason, start_date, end_date, attachment) VALUES (?, ?, ?, ?, ?)").run(
      user_id, reason, start_date, end_date, attachment
    );
    res.json({ success: true });
  });

  // Admin Endpoints
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, username, full_name, role FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users", (req, res) => {
    const { username, password, full_name, role } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)").run(
        username, password, full_name, role
      );
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: "Username sudah digunakan" });
    }
  });

  // Settings Endpoints
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(result);
  });

  app.post("/api/admin/settings", (req, res) => {
    const { school_lat, school_lng, school_radius, start_time, end_time } = req.body;
    if (school_lat) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('school_lat', school_lat.toString());
    if (school_lng) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('school_lng', school_lng.toString());
    if (school_radius) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('school_radius', school_radius.toString());
    if (start_time) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('start_time', start_time);
    if (end_time) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('end_time', end_time);
    res.json({ success: true });
  });

  // Classes CRUD
  app.get("/api/classes", (req, res) => {
    res.json(db.prepare("SELECT * FROM classes ORDER BY name").all());
  });
  app.post("/api/admin/classes", (req, res) => {
    const { name } = req.body;
    db.prepare("INSERT INTO classes (name) VALUES (?)").run(name);
    res.json({ success: true });
  });
  app.delete("/api/admin/classes/:id", (req, res) => {
    db.prepare("DELETE FROM classes WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Subjects CRUD
  app.get("/api/subjects", (req, res) => {
    res.json(db.prepare("SELECT * FROM subjects ORDER BY name").all());
  });
  app.post("/api/admin/subjects", (req, res) => {
    const { name } = req.body;
    db.prepare("INSERT INTO subjects (name) VALUES (?)").run(name);
    res.json({ success: true });
  });
  app.delete("/api/admin/subjects/:id", (req, res) => {
    db.prepare("DELETE FROM subjects WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/recap/attendance", (req, res) => {
    const data = db.prepare(`
      SELECT a.*, u.full_name 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.timestamp DESC
    `).all();
    res.json(data);
  });

  app.get("/api/admin/recap/permissions", (req, res) => {
    const data = db.prepare(`
      SELECT p.*, u.full_name 
      FROM permissions p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.timestamp DESC
    `).all();
    res.json(data);
  });

  app.get("/api/admin/export/attendance", (req, res) => {
    const data = db.prepare(`
      SELECT u.full_name as Nama, a.type as Tipe, a.timestamp as Waktu, a.location_tag as Lokasi, a.latitude, a.longitude
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.timestamp DESC
    `).all();
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="rekap_absensi.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("public_html"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("public_html/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

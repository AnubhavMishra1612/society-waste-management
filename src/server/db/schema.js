import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultDbPath = path.join(dataDir, 'societyclean.db');

export function initDatabase(dbPath = defaultDbPath) {
  const db = new Database(dbPath);

  // Enable WAL mode for high concurrency & Foreign Keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Societies Table
    CREATE TABLE IF NOT EXISTS societies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      wings_config TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      society_id TEXT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'resident',
      phone TEXT,
      employee_id TEXT,
      wing TEXT,
      flat_number TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (society_id) REFERENCES societies(id)
    );

    -- Complaints Table
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      society_id TEXT NOT NULL,
      reference_number TEXT UNIQUE NOT NULL,
      resident_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      wing TEXT NOT NULL,
      floor_location TEXT NOT NULL,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      assigned_to_user_id TEXT,
      resolution_photo_url TEXT,
      resolution_notes TEXT,
      resolved_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (society_id) REFERENCES societies(id),
      FOREIGN KEY (resident_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
    );

    -- Status History Table (Audit Trail)
    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by_user_id TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
    );

    -- Collection Schedules Table
    CREATE TABLE IF NOT EXISTS collection_schedules (
      id TEXT PRIMARY KEY,
      society_id TEXT NOT NULL,
      waste_category TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      instructions TEXT,
      disposal_location TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (society_id) REFERENCES societies(id)
    );

    -- Indexes for high-performance querying
    CREATE INDEX IF NOT EXISTS idx_complaints_society_status ON complaints(society_id, status);
    CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints(resident_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to_user_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_complaint ON status_history(complaint_id, created_at);
  `);

  // Safe migration for employee_id column on pre-existing databases
  try {
    db.exec(`ALTER TABLE users ADD COLUMN employee_id TEXT`);
  } catch (err) {
    // Column already exists, safe to ignore
  }

  // Safe migration for disposal_location column on collection_schedules
  try {
    db.exec(`ALTER TABLE collection_schedules ADD COLUMN disposal_location TEXT`);
  } catch (err) {
    // Column already exists, safe to ignore
  }

  return db;
}

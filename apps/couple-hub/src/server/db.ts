import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let instance: DatabaseSync | undefined;
export function db() {
  if (instance) return instance;
  const path = resolve(process.env.COUPLE_DB_PATH || ".data/couple-hub.sqlite");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  instance = new DatabaseSync(path);
  instance.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  instance.exec("BEGIN IMMEDIATE");
  try {
    instance.exec(`
    CREATE TABLE IF NOT EXISTS couples(id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS users(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, coupleId TEXT REFERENCES couples(id),
      shareHealth INTEGER NOT NULL DEFAULT 0 CHECK(shareHealth IN (0,1))
    );
    CREATE TABLE IF NOT EXISTS sessions(
      hash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invites(
      hash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS records(
      id TEXT PRIMARY KEY, collection TEXT NOT NULL,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      coupleId TEXT REFERENCES couples(id), data TEXT NOT NULL,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS records_owner ON records(userId,collection);
    CREATE INDEX IF NOT EXISTS records_couple ON records(coupleId,collection);
    CREATE INDEX IF NOT EXISTS sessions_owner ON sessions(userId);
    CREATE TABLE IF NOT EXISTS throttle(key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expiresAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS user_changes(
      userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TRIGGER IF NOT EXISTS record_insert_change AFTER INSERT ON records BEGIN
      INSERT INTO user_changes(userId,version) SELECT id,1 FROM users
      WHERE id=NEW.userId OR (NEW.coupleId IS NOT NULL AND coupleId=NEW.coupleId)
      ON CONFLICT(userId) DO UPDATE SET version=version+1;
    END;
    CREATE TRIGGER IF NOT EXISTS record_update_change AFTER UPDATE ON records BEGIN
      INSERT INTO user_changes(userId,version) SELECT id,1 FROM users
      WHERE id=NEW.userId OR (NEW.coupleId IS NOT NULL AND coupleId=NEW.coupleId)
        OR (OLD.coupleId IS NOT NULL AND coupleId=OLD.coupleId)
      ON CONFLICT(userId) DO UPDATE SET version=version+1;
    END;
    CREATE TRIGGER IF NOT EXISTS record_delete_change AFTER DELETE ON records BEGIN
      INSERT INTO user_changes(userId,version) SELECT id,1 FROM users
      WHERE id=OLD.userId OR (OLD.coupleId IS NOT NULL AND coupleId=OLD.coupleId)
      ON CONFLICT(userId) DO UPDATE SET version=version+1;
    END;
    CREATE TRIGGER IF NOT EXISTS user_update_change AFTER UPDATE ON users BEGIN
      INSERT INTO user_changes(userId,version) SELECT id,1 FROM users
      WHERE id=NEW.id OR (NEW.coupleId IS NOT NULL AND coupleId=NEW.coupleId)
        OR (OLD.coupleId IS NOT NULL AND coupleId=OLD.coupleId)
      ON CONFLICT(userId) DO UPDATE SET version=version+1;
    END;
  `);
    const columns = instance.prepare("PRAGMA table_info(users)").all() as {
      name: string;
    }[];
    if (!columns.some((column) => column.name === "theme"))
      instance.exec(
        "ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light'",
      );
    if (!columns.some((column) => column.name === "username"))
      instance.exec("ALTER TABLE users ADD COLUMN username TEXT");
    instance.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username) WHERE username IS NOT NULL",
    );
    instance.exec("COMMIT");
    return instance;
  } catch (error) {
    instance.exec("ROLLBACK");
    instance.close();
    instance = undefined;
    throw error;
  }
}

export function transaction<T>(fn: () => T): T {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    connection.exec("COMMIT");
    return result;
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}

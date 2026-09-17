import { env } from "cloudflare:workers";
import { INITIAL_STATE } from "./seed-data";
import { normalizeBookState, type ManagedBookState as BookState } from "./semester";

export const SESSION_COOKIE = "caderno_coc_session";
const SESSION_HOURS = 12;
const PASSWORD_ITERATIONS = 100_000;

function getDatabase(): D1Database {
  if (!env.DB) throw new Error("Banco de dados indisponível.");
  return env.DB;
}

function bytesToBase64(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

async function derivePassword(password: string, salt: Uint8Array, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, iterations },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function secureEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function adminIsConfigured(): Promise<boolean> {
  const row = await getDatabase()
    .prepare("SELECT id FROM admin_credentials WHERE id = 1")
    .first();
  return Boolean(row);
}

export async function createAdminPassword(password: string): Promise<void> {
  if (await adminIsConfigured()) throw new Error("A senha administrativa já foi criada.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  const now = new Date().toISOString();
  await getDatabase()
    .prepare(
      "INSERT INTO admin_credentials (id, password_hash, password_salt, iterations, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?)",
    )
    .bind(hash, bytesToBase64(salt), PASSWORD_ITERATIONS, now, now)
    .run();
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const row = await getDatabase()
    .prepare(
      "SELECT password_hash AS passwordHash, password_salt AS passwordSalt, iterations FROM admin_credentials WHERE id = 1",
    )
    .first<{ passwordHash: string; passwordSalt: string; iterations: number }>();
  if (!row) return false;
  const computed = await derivePassword(password, base64ToBytes(row.passwordSalt), row.iterations);
  return secureEquals(computed, row.passwordHash);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!(await verifyAdminPassword(currentPassword))) throw new Error("Senha atual incorreta.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(newPassword, salt);
  const now = new Date().toISOString();
  await getDatabase()
    .prepare(
      "UPDATE admin_credentials SET password_hash = ?, password_salt = ?, iterations = ?, updated_at = ? WHERE id = 1",
    )
    .bind(hash, bytesToBase64(salt), PASSWORD_ITERATIONS, now)
    .run();
  await getDatabase().prepare("DELETE FROM admin_sessions").run();
}

export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  await getDatabase()
    .prepare("INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)")
    .bind(tokenHash, expiresAt.toISOString(), now.toISOString())
    .run();
  return { token, expiresAt };
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function sessionIsValid(request: Request): Promise<boolean> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return false;
  const tokenHash = await sha256(token);
  const row = await getDatabase()
    .prepare("SELECT expires_at AS expiresAt FROM admin_sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ expiresAt: string }>();
  if (!row || new Date(row.expiresAt).getTime() <= Date.now()) {
    if (row) {
      await getDatabase().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
    return false;
  }
  return true;
}

export async function destroySession(request: Request): Promise<void> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  await getDatabase()
    .prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}

export function sessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function loginRateLimited(identifier: string): Promise<boolean> {
  const row = await getDatabase()
    .prepare("SELECT count, window_started_at AS windowStartedAt FROM login_attempts WHERE identifier = ?")
    .bind(identifier)
    .first<{ count: number; windowStartedAt: string }>();
  if (!row) return false;
  return Date.now() - new Date(row.windowStartedAt).getTime() < 15 * 60 * 1000 && row.count >= 8;
}

export async function registerFailedLogin(identifier: string): Promise<void> {
  const db = getDatabase();
  const row = await db
    .prepare("SELECT count, window_started_at AS windowStartedAt FROM login_attempts WHERE identifier = ?")
    .bind(identifier)
    .first<{ count: number; windowStartedAt: string }>();
  const now = new Date();
  if (!row || now.getTime() - new Date(row.windowStartedAt).getTime() >= 15 * 60 * 1000) {
    await db
      .prepare("INSERT OR REPLACE INTO login_attempts (identifier, count, window_started_at) VALUES (?, 1, ?)")
      .bind(identifier, now.toISOString())
      .run();
    return;
  }
  await db.prepare("UPDATE login_attempts SET count = count + 1 WHERE identifier = ?").bind(identifier).run();
}

export async function clearFailedLogins(identifier: string): Promise<void> {
  await getDatabase().prepare("DELETE FROM login_attempts WHERE identifier = ?").bind(identifier).run();
}

export async function getBookState(): Promise<BookState> {
  const db = getDatabase();
  const row = await db
    .prepare("SELECT state_json AS stateJson FROM payment_book_state WHERE id = 1")
    .first<{ stateJson: string }>();
  if (row) return normalizeBookState(JSON.parse(row.stateJson) as BookState);
  await db
    .prepare("INSERT INTO payment_book_state (id, state_json, updated_at) VALUES (1, ?, ?)")
    .bind(JSON.stringify(INITIAL_STATE), INITIAL_STATE.updatedAt)
    .run();
  return normalizeBookState(INITIAL_STATE);
}

export async function saveBookState(state: BookState): Promise<BookState> {
  const db = getDatabase();
  const current = await db.prepare("SELECT state_json AS stateJson, updated_at AS updatedAt FROM payment_book_state WHERE id = 1").first<{ stateJson: string; updatedAt: string }>();
  if (current) await createBookSnapshot(db, current.stateJson, current.updatedAt, false);
  const next = { ...state, updatedAt: new Date().toISOString() } satisfies BookState;
  await db
    .prepare("INSERT OR REPLACE INTO payment_book_state (id, state_json, updated_at) VALUES (1, ?, ?)")
    .bind(JSON.stringify(next), next.updatedAt)
    .run();
  return next;
}

async function createBookSnapshot(db: D1Database, stateJson: string, sourceUpdatedAt: string, force: boolean): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    const exists = await db.prepare("SELECT id FROM payment_book_state WHERE id > 1 AND updated_at LIKE ? LIMIT 1").bind(`${today}%`).first();
    if (exists) return;
  }
  const nextId = await db.prepare("SELECT COALESCE(MAX(id), 1) + 1 AS id FROM payment_book_state").first<{ id: number }>();
  const createdAt = new Date().toISOString();
  await db.prepare("INSERT INTO payment_book_state (id, state_json, updated_at) VALUES (?, ?, ?)").bind(nextId?.id ?? 2, JSON.stringify({ state: JSON.parse(stateJson), sourceUpdatedAt, createdAt }), createdAt).run();
  await db.prepare("DELETE FROM payment_book_state WHERE id > 1 AND id NOT IN (SELECT id FROM payment_book_state WHERE id > 1 ORDER BY updated_at DESC LIMIT 30)").run();
}

export async function createManualBackup(): Promise<void> {
  const db = getDatabase();
  const current = await db.prepare("SELECT state_json AS stateJson, updated_at AS updatedAt FROM payment_book_state WHERE id = 1").first<{ stateJson: string; updatedAt: string }>();
  if (current) await createBookSnapshot(db, current.stateJson, current.updatedAt, true);
}

export async function listBookBackups(): Promise<Array<{ id: number; createdAt: string; sourceUpdatedAt: string }>> {
  const rows = await getDatabase().prepare("SELECT id, state_json AS stateJson, updated_at AS createdAt FROM payment_book_state WHERE id > 1 ORDER BY updated_at DESC LIMIT 30").all<{ id: number; stateJson: string; createdAt: string }>();
  return (rows.results ?? []).map((row) => { try { const data = JSON.parse(row.stateJson) as { sourceUpdatedAt?: string }; return { id: row.id, createdAt: row.createdAt, sourceUpdatedAt: data.sourceUpdatedAt ?? row.createdAt }; } catch { return { id: row.id, createdAt: row.createdAt, sourceUpdatedAt: row.createdAt }; } });
}

export async function restoreBookBackup(id: number): Promise<BookState> {
  const db = getDatabase();
  const backup = await db.prepare("SELECT state_json AS stateJson FROM payment_book_state WHERE id = ? AND id > 1").bind(id).first<{ stateJson: string }>();
  if (!backup) throw new Error("Backup não encontrado.");
  const current = await db.prepare("SELECT state_json AS stateJson, updated_at AS updatedAt FROM payment_book_state WHERE id = 1").first<{ stateJson: string; updatedAt: string }>();
  if (current) await createBookSnapshot(db, current.stateJson, current.updatedAt, true);
  const envelope = JSON.parse(backup.stateJson) as { state?: BookState };
  const restored = normalizeBookState(envelope.state ?? envelope as unknown as BookState);
  return saveBookState(restored);
}

export async function databaseIsHealthy(): Promise<boolean> {
  try { await getDatabase().prepare("SELECT id FROM payment_book_state LIMIT 1").first(); return true; } catch { return false; }
}

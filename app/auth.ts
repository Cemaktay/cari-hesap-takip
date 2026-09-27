import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { accounts, sessions } from "../db/schema";

const COOKIE = "cari_session";
const TTL = 7 * 24 * 60 * 60 * 1000;
const enc = new TextEncoder();
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
const randomHex = (size: number) => hex(crypto.getRandomValues(new Uint8Array(size)));
const sha = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))));
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256)));
}
async function matches(password: string, salt: string, expected: string) {
  const actual = await passwordHash(password, salt);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
function cookieValue(request: Request) {
  return request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1) ?? "";
}
export const sessionCookie = (token: string) => `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL / 1000}`;
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export async function getSession(request: Request) {
  const token = cookieValue(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const [row] = await getDb().select({ account: accounts }).from(sessions).innerJoin(accounts, eq(sessions.accountId, accounts.id)).where(and(eq(sessions.tokenHash, await sha(token)), gt(sessions.expiresAt, Date.now()))).limit(1);
  return row?.account ?? null;
}
export async function requireAuth(request: Request) {
  const account = await getSession(request);
  if (!account) return Response.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  if (request.method !== "GET" && !sameOrigin(request)) return Response.json({ error: "Geçersiz istek." }, { status: 403 });
  return null;
}
export async function login(username: string, password: string) {
  const db = getDb();
  const [account] = await db.select().from(accounts).where(eq(accounts.usernameNorm, username.toLocaleLowerCase("tr-TR"))).limit(1);
  if (!account || account.lockedUntil > Date.now() || !(await matches(password, account.salt, account.passwordHash))) {
    if (account && account.lockedUntil <= Date.now()) {
      const attempts = account.failedCount + 1;
      await db.update(accounts).set({ failedCount: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0 }).where(eq(accounts.id, account.id));
    }
    return null;
  }
  await db.update(accounts).set({ failedCount: 0, lockedUntil: 0 }).where(eq(accounts.id, account.id));
  const token = randomHex(32);
  await db.insert(sessions).values({ tokenHash: await sha(token), accountId: account.id, expiresAt: Date.now() + TTL });
  return { token, username: account.username };
}
export async function setupFirstAccount(username: string, password: string) {
  if (!/^[\p{L}\p{N}_.-]{3,40}$/u.test(username)) return "Kullanıcı adı 3–40 karakter olmalı.";
  if (password.length < 12 || password.length > 128 || password.toLocaleLowerCase("tr-TR") === "admin") return "En az 12 karakterli, benzersiz bir şifre belirleyin.";
  const db = getDb();
  if ((await db.select({ id: accounts.id }).from(accounts).limit(1)).length) return "Kurulum zaten tamamlanmış.";
  const salt = randomHex(24);
  try {
    await db.insert(accounts).values({ id: 1, username, usernameNorm: username.toLocaleLowerCase("tr-TR"), passwordHash: await passwordHash(password, salt), salt });
  } catch (error) {
    if (error instanceof Error && /UNIQUE|unique constraint/i.test(error.message)) return "Kurulum zaten tamamlanmış.";
    throw error;
  }
  return login(username, password);
}
export async function updateCredentials(account: typeof accounts.$inferSelect, currentPassword: string, username: string, newPassword: string) {
  if (!(await matches(currentPassword, account.salt, account.passwordHash))) return "Mevcut şifre yanlış.";
  if (!/^[\p{L}\p{N}_.-]{3,40}$/u.test(username)) return "Kullanıcı adı 3–40 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullanılabilir.";
  if (newPassword.length < 8 || newPassword.length > 128) return "Yeni şifre en az 8 karakter olmalı.";
  if (newPassword === "Admin") return "Yeni şifre başlangıç şifresinden farklı olmalı.";
  const db = getDb();
  const salt = randomHex(24);
  try {
    await db.update(accounts).set({ username, usernameNorm: username.toLocaleLowerCase("tr-TR"), salt, passwordHash: await passwordHash(newPassword, salt), failedCount: 0, lockedUntil: 0 }).where(eq(accounts.id, account.id));
  } catch (e) {
    if (e instanceof Error && /UNIQUE|unique constraint/i.test(e.message)) return "Bu kullanıcı adı kullanılıyor.";
    throw e;
  }
  await db.delete(sessions).where(eq(sessions.accountId, account.id));
  const token = randomHex(32);
  await db.insert(sessions).values({ tokenHash: await sha(token), accountId: account.id, expiresAt: Date.now() + TTL });
  return { token };
}
export async function logout(request: Request) {
  const token = cookieValue(request);
  if (/^[a-f0-9]{64}$/.test(token)) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha(token)));
}

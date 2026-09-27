import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { sameOrigin, sessionCookie, setupFirstAccount } from "../../../auth";

export async function GET() {
  try {
    const existing = await getDb().select({ id: accounts.id }).from(accounts).limit(1);
    return Response.json({ needed: !existing.length }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Kurulum durumu okunamadı." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Geçersiz istek." }, { status: 403 });
  try {
    const secret = String((env as unknown as { SETUP_KEY?: string }).SETUP_KEY || "");
    const body = await request.json() as { setupKey?: string; username?: string; password?: string };
    const given = String(body.setupKey || "");
    if (secret.length < 24 || secret.startsWith("replace-with") || given.length !== secret.length || !secret || [...secret].reduce((diff, char, index) => diff | (char.charCodeAt(0) ^ given.charCodeAt(index)), 0) !== 0) {
      return Response.json({ error: "Kurulum anahtarı yanlış veya ayarlanmamış." }, { status: 403 });
    }
    const result = await setupFirstAccount(String(body.username || "").trim(), String(body.password || ""));
    if (typeof result === "string") return Response.json({ error: result }, { status: 400 });
    if (!result) return Response.json({ error: "Kurulum tamamlanamadı." }, { status: 500 });
    return Response.json({ username: result.username }, { headers: { "Set-Cookie": sessionCookie(result.token), "Cache-Control": "no-store" } });
  } catch (error) { console.error(error); return Response.json({ error: "Kurulum yapılamadı." }, { status: 500 }); }
}

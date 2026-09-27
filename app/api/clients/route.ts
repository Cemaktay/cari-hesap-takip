import { requireAuth } from "../../auth";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients } from "../../../db/schema";

export async function GET(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { return Response.json({ clients: await getDb().select().from(clients).orderBy(asc(clients.id)) }); }
  catch (e) { console.error(e); return Response.json({ error: "Cari kayıtları yüklenemedi." }, { status: 500 }); }
}

function parse(body: Record<string, unknown>) {
  const str = (key: string) => String(body[key] ?? "").trim();
  const ad = str("ad"), soyad = str("soyad"), telefon = str("telefon"), vd = str("vd"), email = str("email"), vkn = str("vkn"), tc = str("tc"), yon = str("yon");
  const bakiyeKurus = Number(body.bakiyeKurus);
  if (!ad) throw new Error("Adı veya firma unvanını girin.");
  if (vkn && !/^\d{10}$/.test(vkn)) throw new Error("Vergi numarası 10 haneli olmalı.");
  if (tc && !/^\d{11}$/.test(tc)) throw new Error("T.C. kimlik numarası 11 haneli olmalı.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Geçerli bir e-posta adresi girin.");
  if (!Number.isSafeInteger(bakiyeKurus) || bakiyeKurus < 0) throw new Error("Geçerli bir açılış bakiyesi girin.");
  if (yon !== "borc" && yon !== "alacak") throw new Error("Bakiye yönünü seçin.");
  return { ad, soyad, telefon, vd, email, vkn: vkn || null, tc: tc || null, bakiyeKurus, yon };
}
function errorResponse(e: unknown) {
  const message = e instanceof Error ? e.message : "İşlem tamamlanamadı.";
  if (message.includes("UNIQUE") || message.includes("unique constraint")) return Response.json({ error: "Bu vergi veya T.C. numarasıyla kayıtlı bir cari var." }, { status: 409 });
  const known = ["Adı veya", "Vergi numarası", "T.C.", "Geçerli", "Bakiye"];
  if (known.some(x => message.startsWith(x))) return Response.json({ error: message }, { status: 400 });
  console.error(e); return Response.json({ error: "İşlem tamamlanamadı. Tekrar deneyin." }, { status: 500 });
}
export async function POST(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const values = parse(await request.json()); const [client] = await getDb().insert(clients).values(values).returning(); return Response.json({ client }, { status: 201 }); }
  catch (e) { return errorResponse(e); }
}
export async function PUT(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const body = await request.json() as Record<string, unknown>; const id = Number(body.id); if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Geçersiz cari." }, { status: 400 }); const values = parse(body); const [client] = await getDb().update(clients).set(values).where(eq(clients.id, id)).returning(); return client ? Response.json({ client }) : Response.json({ error: "Cari bulunamadı." }, { status: 404 }); }
  catch (e) { return errorResponse(e); }
}
export async function DELETE(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const id = Number(new URL(request.url).searchParams.get("id")); if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Geçersiz cari." }, { status: 400 }); const [client] = await getDb().delete(clients).where(eq(clients.id, id)).returning(); return client ? Response.json({ ok: true }) : Response.json({ error: "Cari bulunamadı." }, { status: 404 }); }
  catch (e) {
    if (e instanceof Error && /FOREIGN KEY|foreign key/i.test(e.message)) return Response.json({ error: "Bu cariye ait hareketler var. Önce hareketleri silin." }, { status: 409 });
    return errorResponse(e);
  }
}

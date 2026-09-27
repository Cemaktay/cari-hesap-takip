import { requireAuth } from "../../auth";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients, movements, products } from "../../../db/schema";

export async function GET(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { return Response.json({ movements: await getDb().select().from(movements).orderBy(desc(movements.tarih), desc(movements.id)) }); }
  catch (e) { console.error(e); return Response.json({ error: "Hareketler yüklenemedi." }, { status: 500 }); }
}
async function parse(body: Record<string, unknown>) {
  const clientId = Number(body.clientId);
  const productId = body.productId === null || body.productId === "" || body.productId === undefined ? null : Number(body.productId);
  const tarih = String(body.tarih ?? "").trim();
  const yon = String(body.yon ?? "");
  const tutarKurus = Number(body.tutarKurus);
  const aciklama = String(body.aciklama ?? "").trim();
  if (!Number.isSafeInteger(clientId) || clientId < 1) throw new Error("Cari seçin.");
  if (productId !== null && (!Number.isSafeInteger(productId) || productId < 1)) throw new Error("Geçerli bir ürün veya hizmet seçin.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || Number.isNaN(Date.parse(tarih)) || new Date(tarih).toISOString().slice(0, 10) !== tarih) throw new Error("Geçerli bir işlem tarihi girin.");
  if (yon !== "borc" && yon !== "alacak") throw new Error("İşlem yönünü seçin.");
  if (!Number.isSafeInteger(tutarKurus) || tutarKurus <= 0) throw new Error("Sıfırdan büyük bir tutar girin.");
  const db = getDb();
  if (!(await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1)).length) throw new Error("Seçilen cari bulunamadı.");
  const selected = productId === null ? [] : await db.select({ ad: products.ad }).from(products).where(eq(products.id, productId)).limit(1);
  if (productId !== null && !selected.length) throw new Error("Seçilen ürün veya hizmet bulunamadı.");
  return { clientId, productId, productAd: selected[0]?.ad ?? null, tarih, yon, tutarKurus, aciklama };
}
function failure(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (["Cari seçin", "Geçerli", "İşlem", "Sıfırdan", "Seçilen"].some(x => msg.startsWith(x))) return Response.json({ error: msg }, { status: 400 });
  console.error(e); return Response.json({ error: "Hareket kaydedilemedi. Tekrar deneyin." }, { status: 500 });
}
export async function POST(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const [movement] = await getDb().insert(movements).values(await parse(await request.json())).returning(); return Response.json({ movement }, { status: 201 }); }
  catch (e) { return failure(e); }
}
export async function PUT(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const body = await request.json() as Record<string, unknown>; const id = Number(body.id); if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Geçersiz hareket." }, { status: 400 }); const [movement] = await getDb().update(movements).set(await parse(body)).where(eq(movements.id, id)).returning(); return movement ? Response.json({ movement }) : Response.json({ error: "Hareket bulunamadı." }, { status: 404 }); }
  catch (e) { return failure(e); }
}
export async function DELETE(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const id = Number(new URL(request.url).searchParams.get("id")); if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Geçersiz hareket." }, { status: 400 }); const [movement] = await getDb().delete(movements).where(eq(movements.id, id)).returning(); return movement ? Response.json({ ok: true }) : Response.json({ error: "Hareket bulunamadı." }, { status: 404 }); }
  catch (e) { console.error(e); return Response.json({ error: "Hareket silinemedi." }, { status: 500 }); }
}

import { requireAuth } from "../../auth";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";

export async function GET(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { return Response.json({ products: await getDb().select().from(products).orderBy(asc(products.id)) }); }
  catch (e) { console.error(e); return Response.json({ error: "Kartlar yüklenemedi." }, { status: 500 }); }
}
function parse(body: Record<string, unknown>) {
  const str = (key: string) => String(body[key] ?? "").trim();
  const ad = str("ad"), tur = str("tur"), birim = str("birim"), aciklama = str("aciklama");
  const satisKurus = Number(body.satisKurus);
  if (!ad) throw new Error("Ürün veya hizmet adını girin.");
  if (tur !== "urun" && tur !== "hizmet") throw new Error("Ürün veya hizmet türünü seçin.");
  if (!birim) throw new Error("Birimi girin.");
  if (!Number.isSafeInteger(satisKurus) || satisKurus < 0) throw new Error("Geçerli bir satış tutarı girin.");
  return { ad, tur, birim, satisKurus, aciklama };
}
function failure(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (["Ürün veya", "Birimi", "Geçerli"].some(x => msg.startsWith(x))) return Response.json({ error: msg }, { status: 400 });
  console.error(e); return Response.json({ error: "İşlem tamamlanamadı. Tekrar deneyin." }, { status: 500 });
}
export async function POST(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const [product] = await getDb().insert(products).values(parse(await request.json())).returning(); return Response.json({ product }, { status: 201 }); }
  catch (e) { return failure(e); }
}
export async function PUT(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const body = await request.json() as Record<string, unknown>; const id = Number(body.id); if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Geçersiz kart." }, { status: 400 }); const [product] = await getDb().update(products).set(parse(body)).where(eq(products.id, id)).returning(); return product ? Response.json({ product }) : Response.json({ error: "Kart bulunamadı." }, { status: 404 }); }
  catch (e) { return failure(e); }
}
export async function DELETE(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try { const id = Number(new URL(request.url).searchParams.get("id")); if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Geçersiz kart." }, { status: 400 }); const [product] = await getDb().delete(products).where(eq(products.id, id)).returning(); return product ? Response.json({ ok: true }) : Response.json({ error: "Kart bulunamadı." }, { status: 404 }); }
  catch (e) {
    if (e instanceof Error && /FOREIGN KEY|foreign key/i.test(e.message)) return Response.json({ error: "Bu kart hareketlerde kullanılıyor. Önce ilgili hareketleri silin." }, { status: 409 });
    return failure(e);
  }
}

import { requireAuth } from "../../../auth";
import { getRawDb } from "../../../../db";

type Entry = { ad?: unknown; soyad?: unknown; telefon?: unknown; vd?: unknown; vkn?: unknown; tc?: unknown; email?: unknown; bakiyeKurus?: unknown; yon?: unknown };

export async function POST(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try {
    const body = await request.json() as { clients?: Entry[] };
    const entries = body.clients;
    if (!Array.isArray(entries) || !entries.length || entries.length > 500) return Response.json({ error: "1 ile 500 arasında cari satırı seçin." }, { status: 400 });
    const seenVkn = new Set<string>(), seenTc = new Set<string>();
    const values = entries.map((entry, index) => {
      const row = index + 2;
      const str = (key: keyof Entry) => String(entry[key] ?? "").trim();
      const ad = str("ad"), soyad = str("soyad"), telefon = str("telefon"), vd = str("vd"), vkn = str("vkn"), tc = str("tc"), email = str("email"), yon = str("yon").toLocaleLowerCase("tr-TR");
      const bakiyeKurus = Number(entry.bakiyeKurus);
      if (!ad) throw new Error(`Satır ${row}: Adı / Firma Unvanı boş olamaz.`);
      if (vkn && !/^\d{10}$/.test(vkn)) throw new Error(`Satır ${row}: Vergi No 10 haneli olmalı.`);
      if (tc && !/^\d{11}$/.test(tc)) throw new Error(`Satır ${row}: T.C. Kimlik No 11 haneli olmalı.`);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Satır ${row}: E-mail adresi geçersiz.`);
      if (!Number.isSafeInteger(bakiyeKurus) || bakiyeKurus < 0) throw new Error(`Satır ${row}: Açılış bakiyesi geçersiz.`);
      if (yon !== "borc" && yon !== "alacak") throw new Error(`Satır ${row}: Bakiye yönü Borç veya Alacak olmalı.`);
      if (vkn && seenVkn.has(vkn)) throw new Error(`Satır ${row}: Vergi No dosyada tekrar ediyor.`);
      if (tc && seenTc.has(tc)) throw new Error(`Satır ${row}: T.C. Kimlik No dosyada tekrar ediyor.`);
      if (vkn) seenVkn.add(vkn); if (tc) seenTc.add(tc);
      return [ad, soyad, telefon, vd, vkn || null, tc || null, email, bakiyeKurus, yon] as const;
    });
    const db = getRawDb();
    const statements = values.map(v => db.prepare("INSERT INTO clients (ad, soyad, telefon, vd, vkn, tc, email, bakiye_kurus, yon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...v));
    await db.batch(statements);
    return Response.json({ inserted: values.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("Satır ")) return Response.json({ error: message }, { status: 400 });
    if (/UNIQUE|unique constraint/i.test(message)) return Response.json({ error: "Dosyada, mevcut carilerle aynı Vergi No veya T.C. Kimlik No var. Hiçbir satır eklenmedi." }, { status: 409 });
    console.error(e); return Response.json({ error: "Excel aktarımı tamamlanamadı. Hiçbir satır eklenmedi." }, { status: 500 });
  }
}

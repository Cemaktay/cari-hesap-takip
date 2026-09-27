"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Existing = { vkn: string | null; tc: string | null };
type ImportClient = { ad: string; soyad: string; telefon: string; vd: string; vkn: string; tc: string; email: string; bakiyeKurus: number; yon: "borc" | "alacak"; row: number };
const normalized = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("tr-TR").replace(/[ıİ]/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const aliases: Record<string, keyof Omit<ImportClient, "row" | "bakiyeKurus" | "yon"> | "bakiye" | "yon"> = {
  adifirmaunvani: "ad", adi: "ad", ad: "ad", firmaunvani: "ad", unvan: "ad",
  soyadi: "soyad", soyad: "soyad", telefonnumarasi: "telefon", telefon: "telefon",
  vergidairesi: "vd", vergino: "vkn", verginumarasi: "vkn", vkn: "vkn",
  tckimlikno: "tc", tckimliknumarasi: "tc", tc: "tc", tckn: "tc",
  email: "email", eposta: "email", emailadresi: "email",
  acilisbakiyesi: "bakiye", bakiye: "bakiye", bakiyeyonu: "yon", bakiyeturu: "yon",
};
function parseAmount(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  const numeric = typeof value === "number" ? value : Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  if (!Number.isFinite(numeric) || numeric < 0 || Math.abs(Math.round(numeric * 100) - numeric * 100) > 0.00001) return null;
  return Math.round(numeric * 100);
}

export default function ClientExcelImport({ existing, onImported }: { existing: Existing[]; onImported: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportClient[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    setRows([]); setErrors([]); setFileName(file?.name ?? "");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 5 * 1024 * 1024) { setErrors(["En fazla 5 MB boyutunda bir .xlsx dosyası seçin."]); return; }
    setBusy(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const sheet = await readSheet(file);
      if (!sheet.length) throw new Error("Dosya boş.");
      const headers = sheet[0].map(normalized);
      const fields = headers.map(h => aliases[h] ?? null);
      if (!fields.includes("ad")) throw new Error("İlk satırda “Adı / Firma Unvanı” başlığı bulunamadı. Örnek Excel dosyasını kullanın.");
      if (new Set(fields.filter(Boolean)).size !== fields.filter(Boolean).length) throw new Error("Aynı alan için birden fazla başlık var.");
      const result: ImportClient[] = [], issues: string[] = [];
      const vkns = new Set<string>(), tcs = new Set<string>();
      for (let index = 1; index < sheet.length; index++) {
        const cells = sheet[index];
        if (cells.every(cell => cell === null || String(cell).trim() === "")) continue;
        const values: Record<string, unknown> = {};
        fields.forEach((field, column) => { if (field) values[field] = cells[column]; });
        const str = (key: string) => String(values[key] ?? "").trim();
        const ad = str("ad"), soyad = str("soyad"), telefon = str("telefon"), vd = str("vd"), vkn = str("vkn"), tc = str("tc"), email = str("email");
        const yonText = normalized(values.yon || "Borç");
        const bakiyeKurus = parseAmount(values.bakiye);
        const row = index + 1;
        if (!ad) issues.push(`Satır ${row}: Adı / Firma Unvanı boş.`);
        if (vkn && !/^\d{10}$/.test(vkn)) issues.push(`Satır ${row}: Vergi No 10 haneli olmalı.`);
        if (tc && !/^\d{11}$/.test(tc)) issues.push(`Satır ${row}: T.C. Kimlik No 11 haneli olmalı.`);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push(`Satır ${row}: E-mail geçersiz.`);
        if (bakiyeKurus === null) issues.push(`Satır ${row}: Açılış bakiyesi geçersiz.`);
        if (yonText !== "borc" && yonText !== "alacak") issues.push(`Satır ${row}: Bakiye yönü Borç veya Alacak olmalı.`);
        if (vkn && (vkns.has(vkn) || existing.some(c => c.vkn === vkn))) issues.push(`Satır ${row}: Vergi No tekrar ediyor.`);
        if (tc && (tcs.has(tc) || existing.some(c => c.tc === tc))) issues.push(`Satır ${row}: T.C. Kimlik No tekrar ediyor.`);
        if (vkn) vkns.add(vkn); if (tc) tcs.add(tc);
        result.push({ ad, soyad, telefon, vd, vkn, tc, email, bakiyeKurus: bakiyeKurus ?? 0, yon: yonText === "alacak" ? "alacak" : "borc", row });
      }
      if (!result.length) issues.push("Dosyada cari satırı bulunamadı.");
      if (result.length > 500) issues.push("Tek seferde en fazla 500 cari aktarılabilir.");
      setRows(result); setErrors(issues);
    } catch (e) { setErrors([e instanceof Error ? e.message : "Excel okunamadı. Örnek dosyayı kullanın."]); }
    finally { setBusy(false); }
  };
  const importRows = async () => {
    setBusy(true); setErrors([]);
    try {
      const response = await fetch("/api/clients/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clients: rows.map(({ row, ...client }) => client) }) });
      const data = await response.json() as { inserted?: number; error?: string };
      if (!response.ok) throw new Error(data.error);
      setOpen(false); setRows([]); await onImported(); toast.success(`${data.inserted} cari kartı eklendi.`);
    } catch (e) { setErrors([e instanceof Error ? e.message : "Aktarım başarısız."]); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" onClick={() => { setOpen(true); setRows([]); setErrors([]); setFileName(""); }} className="h-11"><Upload className="mr-2 h-4 w-4" /> Excel’den Cari Ekle</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Excel’den Cari Kartı Ekle</DialogTitle></DialogHeader>
      <div className="rounded-xl border border-[#dce5ed] bg-[#f8fafc] p-4"><div className="flex items-start gap-3"><FileSpreadsheet className="h-6 w-6 text-[#087c94]" /><div><p className="font-medium">Örnek Cari Excel Dosyası</p><p className="mt-1 text-sm text-[#607387]">Başlıkları koruyun. Örnek satırı kendi mükellef bilgilerinizle değiştirin; altına yeni satırlar ekleyin.</p><a href="/Ornek_Cari_Kartlari.xlsx" download className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#087c94] underline"><Download className="h-4 w-4" /> Örnek Excel’i İndir</a></div></div><p className="mt-3 text-sm text-[#607387]">Örnek: Örnek Firma · Çatalca · 1.250,50 ₺ Borç</p></div>
      <label className="block text-sm font-medium">Doldurulmuş Excel dosyası (.xlsx)<Input className="mt-2" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => void pick(e.target.files?.[0])} /></label>
      {fileName && <p className="text-sm text-[#607387]">Dosya: {fileName}</p>}
      {errors.length > 0 && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><p className="font-medium">Aktarımdan önce düzeltin:</p><ul className="mt-2 list-inside list-disc space-y-1">{errors.slice(0, 12).map((error, index) => <li key={index}>{error}</li>)}</ul>{errors.length > 12 && <p>…ve {errors.length - 12} hata daha.</p>}</div>}
      {rows.length > 0 && <div><p className="mb-2 font-medium">{rows.length} cari satırı bulundu</p><div className="max-h-56 overflow-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-[#f4f7fa]"><tr><th className="p-2 text-left">Satır</th><th className="p-2 text-left">Ad / Unvan</th><th className="p-2 text-left">Vergi No / T.C.</th><th className="p-2 text-right">Açılış</th></tr></thead><tbody>{rows.slice(0, 10).map(r => <tr key={r.row} className="border-t"><td className="p-2">{r.row}</td><td className="p-2">{r.ad} {r.soyad}</td><td className="p-2">{r.vkn || r.tc || "—"}</td><td className="p-2 text-right">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(r.bakiyeKurus / 100)} {r.yon === "borc" ? "Borç" : "Alacak"}</td></tr>)}</tbody></table></div>{rows.length > 10 && <p className="mt-2 text-sm text-[#607387]">İlk 10 satır gösteriliyor.</p>}</div>}
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button><Button disabled={busy || !rows.length || !!errors.length} onClick={() => void importRows()} className="bg-[#087c94] text-white hover:bg-[#09677c]">{busy ? "İşleniyor…" : `${rows.length} Cariyi Ekle`}</Button></div>
    </DialogContent></Dialog>
  </>;
}

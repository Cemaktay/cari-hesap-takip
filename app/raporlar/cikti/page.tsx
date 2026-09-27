"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppShare } from "../whatsapp-share";
import { WhatsAppPdfShare } from "../whatsapp-pdf-share";

type Client = { id: number; ad: string; soyad: string; telefon: string; bakiyeKurus: number; yon: "borc" | "alacak" };
type Movement = { id: number; clientId: number; tarih: string; yon: "borc" | "alacak"; tutarKurus: number; productAd: string | null; aciklama: string };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Math.abs(k) / 100);
const balance = (k: number) => k === 0 ? money(0) + " Sıfır" : money(k) + (k > 0 ? " Borç" : " Alacak");

export default function PrintReport() {
  const [clients, setClients] = useState<Client[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [params, setParams] = useState({ mode: "month", month: "", start: "", end: "", client: "all" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfHint, setPdfHint] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setParams({ mode: q.get("mode") || "month", month: q.get("month") || "", start: q.get("start") || "", end: q.get("end") || "", client: q.get("client") || "all" });
    void Promise.all(["/api/clients", "/api/movements"].map(u => fetch(u, { cache: "no-store" }))).then(async responses => {
      const data = await Promise.all(responses.map(r => r.json())) as { clients?: Client[]; movements?: Movement[] }[];
      if (!responses[0].ok || !responses[1].ok || !data[0].clients || !data[1].movements) throw new Error();
      setClients(data[0].clients); setMovements(data[1].movements);
    }).catch(() => setError("Rapor yüklenemedi. Önceki ekrana dönüp yeniden deneyin.")).finally(() => setLoading(false));
  }, []);
  const mode = ["all", "month", "range"].includes(params.mode) ? params.mode : "month";
  const start = mode === "all" ? "" : mode === "month" ? params.month + "-01" : params.start;
  const end = mode === "all" ? "9999-12-31" : mode === "month" && /^\d{4}-\d{2}$/.test(params.month) ? params.month + "-" + String(new Date(Number(params.month.slice(0, 4)), Number(params.month.slice(5, 7)), 0).getDate()).padStart(2, "0") : params.end;
  const valid = mode === "all" || (!!start && !!end && start <= end);
  const selected = useMemo(() => clients.filter(c => params.client === "all" || c.id === Number(params.client)), [clients, params.client]);
  const rows = useMemo(() => selected.map(c => {
    let opening = c.yon === "borc" ? c.bakiyeKurus : -c.bakiyeKurus, borc = 0, alacak = 0;
    for (const m of movements) if (m.clientId === c.id) {
      if (m.tarih < start) opening += m.yon === "borc" ? m.tutarKurus : -m.tutarKurus;
      else if (m.tarih <= end) { if (m.yon === "borc") borc += m.tutarKurus; else alacak += m.tutarKurus; }
    }
    return { client: c, opening, borc, alacak, closing: opening + borc - alacak };
  }).sort((a, b) => (a.client.ad + a.client.soyad).localeCompare(b.client.ad + b.client.soyad, "tr")), [selected, movements, start, end]);
  const detail = useMemo(() => movements.filter(m => (params.client === "all" || m.clientId === Number(params.client)) && m.tarih >= start && m.tarih <= end).sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id - a.id), [movements, params.client, start, end]);
  const period = mode === "all" ? "Tüm hareketler" : mode === "month" ? params.month.slice(5) + "." + params.month.slice(0, 4) : params.start.split("-").reverse().join(".") + " – " + params.end.split("-").reverse().join(".");

  return <div className="print-screen min-h-screen bg-[#eef3f7] px-4 py-6 text-[#16283b] md:px-8">
    <div className="print-toolbar mx-auto mb-5 flex max-w-6xl flex-wrap items-center gap-3"><a href="/raporlar/" className="mr-auto inline-flex items-center gap-2 font-medium text-[#087c94]"><ArrowLeft className="h-4 w-4" /> Raporlara Dön</a><Button disabled={loading || !!error || !valid} onClick={() => window.print()} className="bg-[#087c94] text-white hover:bg-[#09677c]"><Printer className="mr-2 h-4 w-4" /> Yazdır</Button><Button disabled={loading || !!error || !valid} variant="outline" onClick={() => { setPdfHint(true); setTimeout(() => window.print(), 60); }}><FileDown className="mr-2 h-4 w-4" /> PDF olarak kaydet</Button></div>
    {pdfHint && <p className="print-toolbar mx-auto mb-4 max-w-6xl rounded-lg bg-sky-50 p-3 text-sm text-sky-900">Açılan yazdırma penceresinde hedef olarak “PDF olarak kaydet” seçin.</p>}
    <div className="print-document mx-auto max-w-6xl">
      {error ? <p role="alert" className="rounded-xl bg-white p-8 text-red-700">{error}</p> : loading ? <p className="rounded-xl bg-white p-8">Rapor hazırlanıyor…</p> : !valid ? <p className="rounded-xl bg-white p-8 text-red-700">Geçerli bir dönem seçilmedi.</p> : rows.length === 0 ? <p className="rounded-xl bg-white p-8">Gösterilecek mükellef yok.</p> : rows.map(r => {
        const clientMoves = detail.filter(m => m.clientId === r.client.id);
        return <section className="client-report mb-6 bg-white p-6 shadow-md md:p-10" key={r.client.id}>
          <div className="print-toolbar mb-3 flex flex-wrap justify-end gap-2"><WhatsAppShare client={r.client} period={period} opening={r.opening} borc={r.borc} alacak={r.alacak} closing={r.closing} movements={clientMoves} /><WhatsAppPdfShare client={r.client} period={period} opening={r.opening} borc={r.borc} alacak={r.alacak} closing={r.closing} movements={clientMoves} /></div>
          <div className="mb-7 border-b border-[#cbd7e1] pb-4"><h1 className="text-2xl font-semibold">Cari Bakiye Raporu</h1><p className="mt-2 font-medium">{r.client.ad} {r.client.soyad} <span className="text-sm font-normal text-[#607387]">· CR-{String(r.client.id).padStart(4, "0")}</span></p><p className="mt-1 text-sm text-[#607387]">{period}</p></div>
          <div className="report-totals mb-7 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">Dönem Başı</span><strong>{balance(r.opening)}</strong></div><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">Dönem Borç</span><strong>{money(r.borc)}</strong></div><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">Dönem Alacak</span><strong>{money(r.alacak)}</strong></div><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">Dönem Sonu</span><strong>{balance(r.closing)}</strong></div></div>
          <h2 className="mb-3 text-lg font-semibold">Hareket Ayrıntıları ({clientMoves.length})</h2>
          {clientMoves.length === 0 ? <p className="text-sm text-[#607387]">Bu dönemde hareket yok.</p> : <div className="screen-scroll"><table className="report-table"><thead><tr><th>Tarih</th><th>Ürün/Hizmet</th><th>Açıklama</th><th>Yön</th><th>Tutar</th></tr></thead><tbody>{clientMoves.map(m => <tr key={m.id}><td>{m.tarih.split("-").reverse().join(".")}</td><td>{m.productAd || "—"}</td><td>{m.aciklama || "—"}</td><td>{m.yon === "borc" ? "Borç" : "Alacak"}</td><td>{money(m.tutarKurus)}</td></tr>)}</tbody></table></div>}
        </section>;
      })}
    </div>
  </div>;
}

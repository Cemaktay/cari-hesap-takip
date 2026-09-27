"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collectionPeriod, collectionRows, formatDate, formatMoney, type CollectionClient, type CollectionMode, type CollectionMovement } from "../../collection-data";

export default function CollectionPrintPage() {
  const [clients, setClients] = useState<CollectionClient[]>([]);
  const [movements, setMovements] = useState<CollectionMovement[]>([]);
  const [query, setQuery] = useState({ mode: "day", day: "", month: "", start: "", end: "", clients: "all" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfHint, setPdfHint] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setQuery({ mode: q.get("mode") || "day", day: q.get("day") || "", month: q.get("month") || "", start: q.get("start") || "", end: q.get("end") || "", clients: q.get("clients") || "" });
    void Promise.all(["/api/clients", "/api/movements"].map(url => fetch(url, { cache: "no-store" }))).then(async responses => {
      const data = await Promise.all(responses.map(response => response.json())) as { clients?: CollectionClient[]; movements?: CollectionMovement[] }[];
      if (!responses[0].ok || !responses[1].ok || !data[0].clients || !data[1].movements) throw new Error();
      setClients(data[0].clients); setMovements(data[1].movements);
    }).catch(() => setError("Tahsilat raporu yüklenemedi.")).finally(() => setLoading(false));
  }, []);
  const mode: CollectionMode = query.mode === "month" || query.mode === "range" ? query.mode : "day";
  const period = collectionPeriod(mode, query.day, query.month, query.start, query.end);
  const selected = query.clients === "all" ? null : query.clients.split(",").filter(value => /^\d+$/.test(value)).map(Number);
  const report = useMemo(() => collectionRows(clients, movements, period.from, period.to, selected), [clients, movements, period.from, period.to, query.clients]);
  return <div className="print-screen min-h-screen bg-[#eef3f7] px-4 py-6 text-[#16283b] md:px-8">
    <div className="print-toolbar mx-auto mb-5 flex max-w-6xl flex-wrap items-center gap-3"><a href="/raporlar/" className="mr-auto inline-flex items-center gap-2 font-medium text-[#087c94]"><ArrowLeft className="h-4 w-4" /> Raporlara Dön</a><Button disabled={loading || !!error || !period.valid || !selected?.length && selected !== null} onClick={() => window.print()} className="bg-[#087c94] text-white hover:bg-[#09677c]"><Printer className="mr-2 h-4 w-4" /> Yazdır</Button><Button disabled={loading || !!error || !period.valid || !selected?.length && selected !== null} variant="outline" onClick={() => { setPdfHint(true); setTimeout(() => window.print(), 60); }}><FileDown className="mr-2 h-4 w-4" /> PDF olarak kaydet</Button></div>
    {pdfHint && <p className="print-toolbar mx-auto mb-4 max-w-6xl rounded-lg bg-sky-50 p-3 text-sm text-sky-900">Açılan yazdırma penceresinde hedef olarak “PDF olarak kaydet” seçin.</p>}
    <div className="print-document mx-auto max-w-6xl">
      {error ? <p className="rounded-xl bg-white p-8 text-red-700">{error}</p> : loading ? <p className="rounded-xl bg-white p-8">Rapor hazırlanıyor…</p> : !period.valid || selected !== null && !selected.length ? <p className="rounded-xl bg-white p-8 text-red-700">Geçerli tarih ve mükellef seçimi bulunamadı.</p> : <>
        <section className="client-report mb-6 bg-white p-6 shadow-md md:p-10"><h1 className="text-2xl font-semibold">Tahsilat Raporu</h1><p className="mt-2 text-[#607387]">{period.label} · {selected === null ? "Tüm mükellefler" : `${selected.length} mükellef seçildi`}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">Toplam Tahsilat</span><strong>{formatMoney(report.total)}</strong></div><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">İşlem Sayısı</span><strong>{report.detail.length}</strong></div><div className="rounded-lg border p-3"><span className="block text-sm text-[#607387]">Tahsilatı Olan Mükellef</span><strong>{report.summary.length}</strong></div></div>
          <h2 className="mb-3 mt-7 text-lg font-semibold">Mükellef Özeti</h2>{!report.summary.length ? <p>Bu seçimde tahsilat kaydı yok.</p> : <div className="screen-scroll"><table className="report-table"><thead><tr><th>Mükellef</th><th>İşlem Sayısı</th><th>Toplam</th></tr></thead><tbody>{report.summary.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.count}</td><td>{formatMoney(row.total)}</td></tr>)}</tbody></table></div>}
          <p className="mt-5 text-sm text-[#607387]">Alacak yönünde kaydedilen hareketler tahsilat kabul edilir; açılış bakiyesi dahil değildir.</p>
        </section>
        {report.summary.map(row => <section className="client-report mb-6 bg-white p-6 shadow-md md:p-10" key={row.id}><h2 className="text-2xl font-semibold">Tahsilat Ekstresi</h2><p className="mt-2 font-medium">{row.name} · CR-{String(row.id).padStart(4, "0")}</p><p className="text-sm text-[#607387]">{period.label}</p><div className="my-6 rounded-lg border p-3"><span className="text-sm text-[#607387]">{row.count} işlem · </span><strong>{formatMoney(row.total)}</strong></div><div className="screen-scroll"><table className="report-table"><thead><tr><th>Tarih</th><th>Ürün/Hizmet</th><th>Açıklama</th><th>Tutar</th></tr></thead><tbody>{report.detail.filter(m => m.clientId === row.id).map(m => <tr key={m.id}><td>{formatDate(m.tarih)}</td><td>{m.productAd || "—"}</td><td>{m.aciklama || "—"}</td><td>{formatMoney(m.tutarKurus)}</td></tr>)}</tbody></table></div></section>)}
      </>}
    </div>
  </div>;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppShare } from "./whatsapp-share";
import { WhatsAppPdfShare } from "./whatsapp-pdf-share";
import { CollectionReport } from "./collection-report";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Client = { id: number; ad: string; soyad: string; telefon: string; bakiyeKurus: number; yon: "borc" | "alacak" };
type Movement = { id: number; clientId: number; tarih: string; yon: "borc" | "alacak"; tutarKurus: number; productAd: string | null; aciklama: string };
type Row = { client: Client; opening: number; borc: number; alacak: number; closing: number };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Math.abs(k) / 100);
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const balance = (k: number) => k === 0 ? money(0) + " Sıfır" : money(k) + (k > 0 ? " Borç" : " Alacak");

export default function ReportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [mode, setMode] = useState<"month" | "range" | "all">("month");
  const [reportType, setReportType] = useState<"balance" | "collections">("balance");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [start, setStart] = useState(() => today().slice(0, 7) + "-01");
  const [end, setEnd] = useState(today);
  const [clientId, setClientId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const responses = await Promise.all(["/api/clients", "/api/movements"].map(u => fetch(u, { cache: "no-store" })));
      const data = await Promise.all(responses.map(r => r.json())) as { clients?: Client[]; movements?: Movement[]; error?: string }[];
      if (!responses[0].ok || !responses[1].ok || !data[0].clients || !data[1].movements) throw new Error("Yükleme başarısız.");
      setClients(data[0].clients); setMovements(data[1].movements); setError("");
    } catch { setError("Rapor verileri yüklenemedi. Tekrar deneyin."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const periodStart = mode === "all" ? "" : mode === "month" ? month + "-01" : start;
  const periodEnd = mode === "all" ? "9999-12-31" : mode === "month" ? month + "-" + String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0") : end;
  const validPeriod = mode === "all" || (mode === "month" ? /^\d{4}-\d{2}$/.test(month) : !!start && !!end && start <= end);
  const rows = useMemo<Row[]>(() => {
    if (!validPeriod) return [];
    return clients.filter(c => clientId === "all" || c.id === Number(clientId)).map(c => {
      let opening = c.yon === "borc" ? c.bakiyeKurus : -c.bakiyeKurus;
      let borc = 0, alacak = 0;
      for (const m of movements) {
        if (m.clientId !== c.id) continue;
        if (m.tarih < periodStart) opening += m.yon === "borc" ? m.tutarKurus : -m.tutarKurus;
        else if (m.tarih <= periodEnd) { if (m.yon === "borc") borc += m.tutarKurus; else alacak += m.tutarKurus; }
      }
      return { client: c, opening, borc, alacak, closing: opening + borc - alacak };
    }).sort((a, b) => (a.client.ad + " " + a.client.soyad).localeCompare(b.client.ad + " " + b.client.soyad, "tr"));
  }, [clients, movements, periodStart, periodEnd, clientId, validPeriod]);
  const detail = useMemo(() => validPeriod ? movements.filter(m => (clientId === "all" || m.clientId === Number(clientId)) && m.tarih >= periodStart && m.tarih <= periodEnd).sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id - a.id) : [], [movements, clientId, periodStart, periodEnd, validPeriod]);
  const periodLabel = mode === "all" ? "Tüm hareketler" : mode === "month" ? month.slice(5) + "." + month.slice(0, 4) : start.split("-").reverse().join(".") + " – " + end.split("-").reverse().join(".");
  const names = useMemo(() => new Map(clients.map(c => [c.id, [c.ad, c.soyad].filter(Boolean).join(" ")])), [clients]);
  const totalBorc = rows.reduce((s, r) => s + r.borc, 0);
  const totalAlacak = rows.reduce((s, r) => s + r.alacak, 0);
  const closingBorc = rows.reduce((s, r) => s + Math.max(0, r.closing), 0);
  const closingAlacak = rows.reduce((s, r) => s + Math.max(0, -r.closing), 0);

  return <div className="report-page min-h-screen bg-[#f4f7fa] text-[#16283b]">
    <header className="border-b border-[#dce5ed] bg-[#102b43] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4 md:px-8"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7891] font-bold tracking-tight"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="h-10 w-10 rounded-xl" /></div><div className="leading-tight"><div className="text-base font-semibold">Cari Hesap</div><div className="text-xs text-[#b9d0de]">Takip Programı</div></div><nav className="ml-auto flex flex-wrap gap-1 text-sm"><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/">Ana Ekran</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/cariler/">Cari Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/urun-hizmet/">Ürün/Hizmet Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/hareketler/">Hareketler</a><a aria-current="page" className="rounded-lg bg-white/15 px-3 py-2 font-medium" href="/raporlar/">Raporlar</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/ayarlar/">Ayarlar</a></nav></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12"><div className="mb-7"><p className="mb-2 text-sm font-semibold text-[#1b7891]">DÖNEM ÖZETİ</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Raporlar</h1><p className="mt-2 text-[#607387]">Cari bakiyeler ve dönemsel tahsilatlar.</p></div>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Rapor kategorisi"><Button variant={reportType === "balance" ? "default" : "outline"} className={reportType === "balance" ? "bg-[#102b43] text-white" : ""} onClick={() => setReportType("balance")}>Cari Bakiye Raporu</Button><Button variant={reportType === "collections" ? "default" : "outline"} className={reportType === "collections" ? "bg-[#102b43] text-white" : ""} onClick={() => setReportType("collections")}>Tahsilat Raporları</Button></div>
      {reportType === "collections" ? error ? <div className="rounded-2xl bg-white p-8 text-red-700">{error}<Button variant="outline" className="ml-3" onClick={() => void refresh()}>Yeniden dene</Button></div> : <CollectionReport clients={clients} movements={movements} loading={loading} /> : <>
      <section className="report-controls mb-6 rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Rapor türü">
          {([ ["month", "Aylık"], ["range", "İki Tarih Arası"], ["all", "Tüm Hareketler"] ] as const).map(([key, label]) => <Button key={key} variant={mode === key ? "default" : "outline"} className={mode === key ? "bg-[#087c94] text-white hover:bg-[#09677c]" : ""} onClick={() => setMode(key)}>{label}</Button>)}
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mode === "month" && <label className="text-sm font-medium">Ay<Input className="mt-1.5" type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>}
          {mode === "range" && <><label className="text-sm font-medium">Başlangıç Tarihi<Input className="mt-1.5" type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label className="text-sm font-medium">Bitiş Tarihi<Input className="mt-1.5" type="date" value={end} onChange={e => setEnd(e.target.value)} /></label></>}
          <div><label className="mb-1.5 block text-sm font-medium">Mükellef</label><Select value={clientId} onValueChange={setClientId}><SelectTrigger className="w-full"><SelectValue placeholder="Tüm mükellefler" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm mükellefler</SelectItem>{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.ad} {c.soyad}</SelectItem>)}</SelectContent></Select></div>
          <Button variant="outline" disabled={loading || !!error || !validPeriod} onClick={() => { const params = new URLSearchParams({ mode, month, start, end, client: clientId }); window.location.href = "/raporlar/cikti/?" + params.toString(); }}>Çıktı Önizleme</Button>
        </div>
        {!validPeriod && <p role="alert" className="mt-3 text-sm text-red-700">Geçerli bir dönem seçin; bitiş tarihi başlangıçtan önce olamaz.</p>}
      </section>
      <p className="print-only mb-4 hidden text-sm">{mode === "all" ? "Tüm hareketler" : mode === "month" ? "Ay: " + month : "Dönem: " + start + " – " + end} · {clientId === "all" ? "Tüm mükellefler" : clients.find(c => c.id === Number(clientId))?.ad + " " + (clients.find(c => c.id === Number(clientId))?.soyad || "")}</p>
      {error ? <div className="rounded-2xl border border-[#dce5ed] bg-white p-10 text-center"><p className="mb-3 text-red-700">{error}</p><Button variant="outline" onClick={() => void refresh()}>Yeniden dene</Button></div> : loading ? <p className="rounded-2xl bg-white p-10 text-center text-[#607387]">Rapor hazırlanıyor…</p> : validPeriod && <>
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-sm text-[#607387]"><ArrowUpRight className="h-5 w-5 text-amber-700" /> Dönem borç hareketleri</div><p className="text-2xl font-semibold tabular-nums">{money(totalBorc)}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-sm text-[#607387]"><ArrowDownRight className="h-5 w-5 text-sky-700" /> Dönem alacak hareketleri</div><p className="text-2xl font-semibold tabular-nums">{money(totalAlacak)}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 text-sm text-[#607387]">Dönem sonu borç bakiyesi</div><p className="text-2xl font-semibold tabular-nums">{money(closingBorc)}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 text-sm text-[#607387]">Dönem sonu alacak bakiyesi</div><p className="text-2xl font-semibold tabular-nums">{money(closingAlacak)}</p></div></section>
        <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-[#e3eaf0] p-5"><CalendarDays className="h-5 w-5 text-[#087c94]" /><h2 className="text-lg font-semibold">Cari Bakiye Raporu</h2><span className="ml-auto text-sm text-[#607387]">{rows.length} mükellef</span></div>{!rows.length ? <p className="p-12 text-center text-[#607387]">Gösterilecek mükellef yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f8fafc]"><TableHead className="pl-5">Mükellef</TableHead><TableHead className="text-right">Dönem Başı</TableHead><TableHead className="text-right">Borç</TableHead><TableHead className="text-right">Alacak</TableHead><TableHead className="text-right">Dönem Sonu</TableHead><TableHead className="pr-5 text-right">Paylaş</TableHead></TableRow></TableHeader><TableBody>{rows.map(r => <TableRow key={r.client.id}><TableCell className="pl-5"><span className="block text-xs text-[#71859a]">CR-{String(r.client.id).padStart(4, "0")}</span><span className="font-medium">{r.client.ad} {r.client.soyad}</span></TableCell><TableCell className="text-right tabular-nums">{balance(r.opening)}</TableCell><TableCell className="text-right tabular-nums">{money(r.borc)}</TableCell><TableCell className="text-right tabular-nums">{money(r.alacak)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{balance(r.closing)}</TableCell><TableCell className="pr-5 text-right"><div className="flex justify-end gap-2"><WhatsAppShare client={r.client} period={periodLabel} opening={r.opening} borc={r.borc} alacak={r.alacak} closing={r.closing} movements={detail.filter(m => m.clientId === r.client.id)} /><WhatsAppPdfShare client={r.client} period={periodLabel} opening={r.opening} borc={r.borc} alacak={r.alacak} closing={r.closing} movements={detail.filter(m => m.clientId === r.client.id)} /></div></TableCell></TableRow>)}</TableBody></Table></div>}</section>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e3eaf0] p-5"><h2 className="text-lg font-semibold">Hareket Ayrıntıları</h2><span className="text-sm text-[#607387]">{detail.length} hareket</span></div>{!detail.length ? <p className="p-10 text-center text-[#607387]">Seçilen dönemde hareket yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f8fafc]"><TableHead className="pl-5">Tarih</TableHead><TableHead>Mükellef</TableHead><TableHead>Ürün/Hizmet</TableHead><TableHead>Açıklama</TableHead><TableHead>Yön</TableHead><TableHead className="pr-5 text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{detail.map(m => <TableRow key={m.id}><TableCell className="pl-5 whitespace-nowrap">{m.tarih.split("-").reverse().join(".")}</TableCell><TableCell>{names.get(m.clientId) || "—"}</TableCell><TableCell>{m.productAd || "—"}</TableCell><TableCell>{m.aciklama || "—"}</TableCell><TableCell>{m.yon === "borc" ? "Borç" : "Alacak"}</TableCell><TableCell className="pr-5 text-right tabular-nums">{money(m.tutarKurus)}</TableCell></TableRow>)}</TableBody></Table></div>}</section>
        <p className="mt-4 text-sm text-[#607387]">Dönem başı, açılış bakiyesi ve başlangıç tarihinden önceki hareketlerle hesaplanır. Dönem sonu, seçilen bitiş tarihi dahil edilerek bulunur.</p>
      </>}
      </>}
    </main>

  </div>;
}

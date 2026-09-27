"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collectionPeriod, collectionRows, formatDate, formatMoney, istanbulToday, type CollectionClient, type CollectionMode, type CollectionMovement } from "./collection-data";

export function CollectionReport({ clients, movements, loading }: { clients: CollectionClient[]; movements: CollectionMovement[]; loading: boolean }) {
  const [mode, setMode] = useState<CollectionMode>("day");
  const [day, setDay] = useState(istanbulToday);
  const [month, setMonth] = useState(() => istanbulToday().slice(0, 7));
  const [start, setStart] = useState(() => istanbulToday().slice(0, 7) + "-01");
  const [end, setEnd] = useState(istanbulToday);
  const [all, setAll] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const period = collectionPeriod(mode, day, month, start, end);
  const report = useMemo(() => collectionRows(clients, movements, period.from, period.to, all ? null : selected), [clients, movements, period.from, period.to, all, selected]);
  const visibleClients = clients.filter(c => `${c.ad} ${c.soyad}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR")));
  const preview = () => {
    const query = new URLSearchParams({ mode, day, month, start, end, clients: all ? "all" : selected.join(",") });
    window.location.href = "/raporlar/tahsilatlar/cikti/?" + query.toString();
  };
  return <>
    <section className="mb-6 rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Tahsilat dönemi">{([ ["day", "Günlük"], ["month", "Aylık"], ["range", "İki Tarih Arası"] ] as const).map(([key, label]) => <Button key={key} variant={mode === key ? "default" : "outline"} className={mode === key ? "bg-[#087c94] text-white hover:bg-[#09677c]" : ""} onClick={() => setMode(key)}>{label}</Button>)}</div>
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mode === "day" && <label className="text-sm font-medium">Gün<Input className="mt-1.5" type="date" value={day} onChange={e => setDay(e.target.value)} /></label>}
        {mode === "month" && <label className="text-sm font-medium">Ay<Input className="mt-1.5" type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>}
        {mode === "range" && <><label className="text-sm font-medium">Başlangıç Tarihi<Input className="mt-1.5" type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label className="text-sm font-medium">Bitiş Tarihi<Input className="mt-1.5" type="date" value={end} onChange={e => setEnd(e.target.value)} /></label></>}
        <Button variant="outline" disabled={loading || !period.valid || (!all && !selected.length)} onClick={preview}>Çıktı Önizleme</Button>
      </div>
      <div className="mt-6 border-t border-[#e3eaf0] pt-5"><div className="mb-3 text-sm font-semibold">Mükellef seçimi</div><div className="flex flex-wrap gap-2"><Button size="sm" variant={all ? "default" : "outline"} onClick={() => setAll(true)} className={all ? "bg-[#087c94] text-white" : ""}>Tüm mükellefler</Button><Button size="sm" variant={!all ? "default" : "outline"} onClick={() => setAll(false)} className={!all ? "bg-[#087c94] text-white" : ""}>Seçilen mükellefler</Button></div>
        {!all && <div className="mt-3 rounded-xl border border-[#dce5ed] p-3"><Input aria-label="Mükellef ara" placeholder="Mükellef ara" value={search} onChange={e => setSearch(e.target.value)} className="mb-3 max-w-sm" /><div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{visibleClients.map(c => <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[#f4f7fa]"><input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(ids => ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id])} /><span>{c.ad} {c.soyad}</span></label>)}</div><p className="mt-2 text-xs text-[#607387]">{selected.length} mükellef seçildi.</p></div>}
        {(!period.valid || (!all && !selected.length)) && <p role="alert" className="mt-3 text-sm text-red-700">{!period.valid ? "Geçerli bir tarih aralığı seçin." : "En az bir mükellef seçin."}</p>}
      </div>
    </section>
    {loading ? <p className="rounded-2xl bg-white p-10 text-center">Rapor hazırlanıyor…</p> : period.valid && (all || selected.length > 0) && <>
      <section className="mb-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><p className="text-sm text-[#607387]">Tahsilat toplamı</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(report.total)}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><p className="text-sm text-[#607387]">Tahsilat kaydı</p><p className="mt-2 text-2xl font-semibold">{report.detail.length}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><p className="text-sm text-[#607387]">Tahsilatı olan mükellef</p><p className="mt-2 text-2xl font-semibold">{report.summary.length}</p></div></section>
      <section className="mb-6 overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="border-b border-[#e3eaf0] p-5"><h2 className="text-lg font-semibold">Mükellef Bazında Tahsilatlar</h2><p className="text-sm text-[#607387]">{period.label}</p></div>{!report.summary.length ? <p className="p-10 text-center text-[#607387]">Bu seçimde tahsilat kaydı yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="pl-5">Mükellef</TableHead><TableHead className="text-right">İşlem Sayısı</TableHead><TableHead className="pr-5 text-right">Toplam Tahsilat</TableHead></TableRow></TableHeader><TableBody>{report.summary.map(r => <TableRow key={r.id}><TableCell className="pl-5 font-medium">{r.name}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="pr-5 text-right font-semibold tabular-nums">{formatMoney(r.total)}</TableCell></TableRow>)}</TableBody></Table></div>}</section>
      <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="border-b border-[#e3eaf0] p-5"><h2 className="text-lg font-semibold">Tahsilat Ayrıntıları</h2></div>{!report.detail.length ? <p className="p-10 text-center text-[#607387]">Bu dönemde tahsilat yok.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="pl-5">Tarih</TableHead><TableHead>Mükellef</TableHead><TableHead>Ürün/Hizmet</TableHead><TableHead>Açıklama</TableHead><TableHead className="pr-5 text-right">Tutar</TableHead></TableRow></TableHeader><TableBody>{report.detail.map(m => <TableRow key={m.id}><TableCell className="pl-5 whitespace-nowrap">{formatDate(m.tarih)}</TableCell><TableCell>{report.names.get(m.clientId)}</TableCell><TableCell>{m.productAd || "—"}</TableCell><TableCell>{m.aciklama || "—"}</TableCell><TableCell className="pr-5 text-right tabular-nums">{formatMoney(m.tutarKurus)}</TableCell></TableRow>)}</TableBody></Table></div>}</section>
      <p className="mt-4 text-sm text-[#607387]">Tahsilat raporu, alacak yönünde kaydedilen hareketleri esas alır. Açılış bakiyesi tahsilat olarak sayılmaz.</p>
    </>}
  </>;
}

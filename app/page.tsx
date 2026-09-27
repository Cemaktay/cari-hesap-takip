"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Balance = { id: number; ad: string; soyad: string; telefon: string; net: number };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(k / 100);

export default function Dashboard() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/balances", { cache: "no-store" });
      if (response.status === 401) { window.location.replace("/giris/"); return; }
      const data = await response.json() as { balances?: Balance[]; error?: string };
      if (!response.ok || !data.balances) throw new Error(data.error);
      setBalances(data.balances); setError("");
    } catch { setError("Güncel bakiyeler yüklenemedi. Tekrar deneyin."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return balances.filter(b => !q || [b.ad, b.soyad, b.telefon, `CR-${String(b.id).padStart(4, "0")}`].some(v => v.toLocaleLowerCase("tr-TR").includes(q)));
  }, [balances, query]);
  const totalBorc = balances.reduce((sum, b) => sum + Math.max(0, b.net), 0);
  const totalAlacak = balances.reduce((sum, b) => sum + Math.max(0, -b.net), 0);
  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) window.location.replace("/giris/");
  };

  return <div className="min-h-screen bg-[#f4f7fa] text-[#16283b]">
    <header className="border-b border-[#dce5ed] bg-[#102b43] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4 md:px-8"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7891] font-bold tracking-tight"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="h-10 w-10 rounded-xl" /></div><div className="leading-tight"><div className="text-base font-semibold">Cari Hesap</div><div className="text-xs text-[#b9d0de]">Takip Programı</div></div><nav className="ml-auto flex flex-wrap gap-1 text-sm"><a aria-current="page" className="rounded-lg bg-white/15 px-3 py-2 font-medium" href="/">Ana Ekran</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/cariler/">Cari Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/urun-hizmet/">Ürün/Hizmet Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/hareketler/">Hareketler</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/raporlar/">Raporlar</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/ayarlar/">Ayarlar</a></nav><button type="button" onClick={() => void logout()} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10">Çıkış Yap</button></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12"><div className="mb-7"><p className="mb-2 text-sm font-semibold text-[#1b7891]">GENEL DURUM</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Ana Ekran</h1><p className="mt-2 text-[#607387]">Tüm mükelleflerin güncel cari bakiyeleri.</p></div>
      <section className="mb-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-3 text-[#607387]"><UsersRound className="h-5 w-5 text-[#087c94]" /> Toplam mükellef</div><p className="text-3xl font-semibold">{balances.length}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-3 text-[#607387]"><ArrowUpRight className="h-5 w-5 text-amber-700" /> Borç bakiyesi toplamı</div><p className="text-3xl font-semibold tabular-nums">{money(totalBorc)}</p></div><div className="rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-3 text-[#607387]"><ArrowDownRight className="h-5 w-5 text-sky-700" /> Alacak bakiyesi toplamı</div><p className="text-3xl font-semibold tabular-nums">{money(totalAlacak)}</p></div></section>
      <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e3eaf0] p-5"><h2 className="text-lg font-semibold">Mükellef Bakiyeleri</h2><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71859a]" /><Input className="pl-10" aria-label="Mükellef ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ad, telefon veya cari no ara" /></div></div>
      {error ? <div className="p-10 text-center"><p className="mb-3 text-red-700">{error}</p><Button variant="outline" onClick={() => void refresh()}>Yeniden dene</Button></div> : loading ? <p className="p-10 text-center text-[#607387]">Bakiyeler yükleniyor…</p> : !filtered.length ? <div className="p-12 text-center"><p className="font-medium">{query ? "Aramanızla eşleşen mükellef yok." : "Henüz cari kaydı yok."}</p>{!query && <a className="mt-4 inline-block rounded-lg bg-[#087c94] px-4 py-2 text-sm font-medium text-white" href="/cariler/">Cari Kartı Ekle</a>}</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f8fafc]"><TableHead className="pl-5">Cari No / Mükellef</TableHead><TableHead>Telefon</TableHead><TableHead className="text-right">Güncel Bakiye</TableHead><TableHead>Durum</TableHead><TableHead className="pr-5 text-right">Hareketler</TableHead></TableRow></TableHeader><TableBody>{filtered.map(b => <TableRow key={b.id}><TableCell className="pl-5"><span className="block text-xs text-[#71859a]">CR-{String(b.id).padStart(4, "0")}</span><span className="font-medium">{b.ad} {b.soyad}</span></TableCell><TableCell>{b.telefon || "—"}</TableCell><TableCell className="text-right font-semibold tabular-nums">{money(Math.abs(b.net))}</TableCell><TableCell><span className={`rounded-full px-3 py-1 text-sm font-medium ${b.net > 0 ? "bg-amber-50 text-amber-800" : b.net < 0 ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-600"}`}>{b.net > 0 ? "Borç" : b.net < 0 ? "Alacak" : "Sıfır"}</span></TableCell><TableCell className="pr-5 text-right"><a className="font-medium text-[#087c94] hover:underline" href={`/hareketler/?cari=${b.id}`}>Görüntüle</a></TableCell></TableRow>)}</TableBody></Table></div>}</section>
      <p className="mt-4 text-sm text-[#607387]">Güncel bakiye, açılış bakiyesi ile kaydedilen borç ve alacak hareketlerinin toplamıdır.</p>
    </main>
  </div>;
}

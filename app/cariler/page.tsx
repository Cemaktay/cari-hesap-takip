"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, UsersRound, Pencil, Trash2, Wallet, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast, Toaster } from "sonner";
import ClientExcelImport from "./client-excel-import";

type Client = { id: number; ad: string; soyad: string; telefon: string; vd: string; vkn: string | null; tc: string | null; email: string; bakiyeKurus: number; yon: "borc" | "alacak" };
type Form = Omit<Client, "id" | "bakiyeKurus"> & { bakiye: string };
const empty: Form = { ad: "", soyad: "", telefon: "", vd: "", vkn: "", tc: "", email: "", bakiye: "", yon: "borc" };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(k / 100);
const numberText = (k: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(k / 100);

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error);
      setClients(data.clients); setLoadError("");
    } catch { setLoadError("Cari kayıtları yüklenemedi. Tekrar deneyin."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return clients.filter(c => !q || [c.ad, c.soyad, c.vkn, c.tc, c.telefon].some(v => v?.toLocaleLowerCase("tr-TR").includes(q)));
  }, [clients, query]);
  const update = (key: keyof Form, value: string) => setForm(f => ({ ...f, [key]: value }));
  const startNew = () => { setEditing(null); setForm(empty); setError(""); setOpen(true); };
  const startEdit = (c: Client) => { setEditing(c.id); setForm({ ...c, bakiye: numberText(c.bakiyeKurus) }); setError(""); setOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const raw = form.bakiye.trim().replace(/\s/g, "");
    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const value = normalized ? Number(normalized) : 0;
    if (!Number.isFinite(value) || value < 0 || Math.abs(Math.round(value * 100) - value * 100) > 0.00001) { setError("Geçerli bir tutar girin (en fazla iki ondalık)."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/clients", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editing, bakiyeKurus: Math.round(value * 100) }) });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error);
      setOpen(false); await refresh(); toast.success(editing ? "Cari güncellendi." : "Cari kaydedildi.");
    } catch (e) { setError(e instanceof Error ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    const id = deleting.id;
    try {
      const res = await fetch("/api/clients?id=" + id, { method: "DELETE" });
      const data = await res.json() as any; if (!res.ok) throw new Error(data.error);
      setDeleting(null); await refresh(); toast.success("Cari silindi.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Silinemedi."); }
  };

  return <div className="min-h-screen bg-[#f4f7fa] text-[#16283b]">
    <Toaster position="top-right" richColors />
    <header className="border-b border-[#dce5ed] bg-[#102b43] text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 md:px-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7891] font-bold tracking-tight"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="h-10 w-10 rounded-xl" /></div>
        <div className="leading-tight"><div className="text-base font-semibold">Cari Hesap</div><div className="text-xs text-[#b9d0de]">Takip Programı</div></div>
        <nav className="ml-auto flex flex-wrap gap-1 text-sm"><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/">Ana Ekran</a><a aria-current="page" className="rounded-lg bg-white/15 px-3 py-2 font-medium" href="/cariler/">Cari Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/urun-hizmet/">Ürün/Hizmet Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/hareketler/">Hareketler</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/raporlar/">Raporlar</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/ayarlar/">Ayarlar</a></nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-sm font-semibold text-[#1b7891]">CARİ YÖNETİMİ</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Cari Kartları</h1><p className="mt-2 text-[#607387]">Cari bilgilerini ve açılış bakiyelerini yönetin.</p></div>
        <div className="flex flex-wrap gap-3"><ClientExcelImport existing={clients} onImported={refresh} /><Button onClick={startNew} className="h-11 bg-[#087c94] px-5 text-white hover:bg-[#09677c]"><Plus className="mr-2 h-4 w-4" /> Yeni Cari Ekle</Button></div>
      </div>
      <section className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="rounded-xl bg-[#e5f4f7] p-3 text-[#087c94]"><UsersRound /></div><div><p className="text-sm text-[#607387]">Toplam cari</p><p className="text-2xl font-semibold">{clients.length}</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-[#dce5ed] bg-white p-5 shadow-sm"><div className="rounded-xl bg-[#ebeff8] p-3 text-[#31568a]"><Wallet /></div><div><p className="text-sm text-[#607387]">Açılış bakiyesi olan</p><p className="text-2xl font-semibold">{clients.filter(c => c.bakiyeKurus > 0).length}</p></div></div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e3eaf0] p-5"><h2 className="text-lg font-semibold">Kayıtlı Cariler</h2><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71859a]" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ad, telefon, VKN veya TCKN ara" aria-label="Cari ara" className="h-10 pl-10" /></div></div>
        {loadError ? <div className="p-10 text-center"><p className="mb-3 text-red-700">{loadError}</p><Button variant="outline" onClick={() => void refresh()}>Yeniden dene</Button></div> :
        loading ? <p className="p-10 text-center text-[#607387]">Kayıtlar yükleniyor…</p> :
        filtered.length === 0 ? <div className="p-12 text-center"><UsersRound className="mx-auto mb-4 h-9 w-9 text-[#9fb5c4]" /><p className="font-medium">{query ? "Aramanızla eşleşen cari yok." : "Henüz cari kaydı yok."}</p><p className="mt-1 text-sm text-[#607387]">{query ? "Başka bir arama deneyin." : "İlk cari kartını ekleyerek başlayın."}</p>{!query && <Button variant="outline" className="mt-5" onClick={startNew}>Yeni Cari Ekle</Button>}</div> :
        <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f8fafc]"><TableHead className="pl-5">Cari No / Ad Soyad</TableHead><TableHead>Telefon</TableHead><TableHead>Vergi Dairesi</TableHead><TableHead>VKN / TCKN</TableHead><TableHead className="text-right">Açılış Bakiyesi</TableHead><TableHead>Durum</TableHead><TableHead className="pr-5 text-right">İşlem</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c => <TableRow key={c.id}><TableCell className="pl-5"><span className="block text-xs text-[#71859a]">CR-{String(c.id).padStart(4, "0")}</span><span className="font-medium">{c.ad} {c.soyad}</span></TableCell><TableCell>{c.telefon || "—"}</TableCell><TableCell>{c.vd || "—"}</TableCell><TableCell className="text-sm">{c.vkn || c.tc || "—"}</TableCell><TableCell className="text-right font-medium tabular-nums">{money(c.bakiyeKurus)}</TableCell><TableCell><span className={`rounded-full px-3 py-1 text-sm font-medium ${c.bakiyeKurus === 0 ? "bg-slate-100 text-slate-600" : c.yon === "borc" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>{c.bakiyeKurus === 0 ? "Sıfır" : c.yon === "borc" ? "Borç" : "Alacak"}</span></TableCell><TableCell className="pr-5 text-right"><Button size="icon" variant="ghost" aria-label={`${c.ad} düzenle`} onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`${c.ad} sil`} onClick={() => setDeleting(c)} className="text-red-700 hover:text-red-800"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>}
      </section>
    </main>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Cari Kartını Düzenle" : "Yeni Cari Ekle"}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{([
      ["ad", "Adı / Firma Unvanı"], ["soyad", "Soyadı"], ["telefon", "Telefon Numarası"], ["email", "E-mail Adresi"], ["vd", "Vergi Dairesi"], ["vkn", "Vergi No (10 hane)"], ["tc", "T.C. Kimlik No (11 hane)"]
    ] as const).map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}<Input className="mt-1.5 h-10" value={form[key] || ""} onChange={e => update(key, e.target.value)} required={key === "ad"} inputMode={key === "vkn" || key === "tc" ? "numeric" : key === "telefon" ? "tel" : "text"} type={key === "email" ? "email" : "text"} maxLength={key === "vkn" ? 10 : key === "tc" ? 11 : undefined} /></label>)}</div><div className="rounded-xl border border-[#dce5ed] bg-[#f8fafc] p-4"><h3 className="mb-3 font-semibold">Açılış Bakiyesi</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Tutar (₺)<Input className="mt-1.5 h-10" inputMode="decimal" placeholder="0,00" value={form.bakiye} onChange={e => update("bakiye", e.target.value)} /></label><div className="text-sm font-medium">Bakiye Türü<RadioGroup className="mt-3 flex gap-6" value={form.yon} onValueChange={v => update("yon", v)}><label className="flex items-center gap-2"><RadioGroupItem value="borc" /> Borç</label><label className="flex items-center gap-2"><RadioGroupItem value="alacak" /> Alacak</label></RadioGroup></div></div></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button><Button type="submit" disabled={saving} className="bg-[#087c94] text-white hover:bg-[#09677c]">{saving ? "Kaydediliyor…" : "Kaydet"}</Button></div></form></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cari silinsin mi?</AlertDialogTitle><AlertDialogDescription>{deleting?.ad} {deleting?.soyad} kaydı kalıcı olarak silinecek.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} className="bg-red-700 text-white hover:bg-red-800">Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

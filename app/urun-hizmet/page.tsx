"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast, Toaster } from "sonner";

type Product = { id: number; ad: string; tur: "urun" | "hizmet"; birim: string; satisKurus: number; aciklama: string };
type Form = Omit<Product, "id" | "satisKurus"> & { satis: string };
const empty: Form = { ad: "", tur: "hizmet", birim: "Adet", satis: "", aciklama: "" };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(k / 100);
const decimal = (k: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(k / 100);

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => {
    try { const res = await fetch("/api/products", { cache: "no-store" }); const data = await res.json() as any; if (!res.ok) throw new Error(data.error); setItems(data.products); setLoadError(""); }
    catch { setLoadError("Ürün ve hizmet kartları yüklenemedi. Tekrar deneyin."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase("tr-TR"); return items.filter(i => !q || [i.ad, i.aciklama, i.birim, i.tur].some(v => v.toLocaleLowerCase("tr-TR").includes(q))); }, [items, query]);
  const update = (key: keyof Form, value: string) => setForm(f => ({ ...f, [key]: value }));
  const startNew = () => { setEditing(null); setForm(empty); setError(""); setOpen(true); };
  const startEdit = (i: Product) => { setEditing(i.id); setForm({ ad: i.ad, tur: i.tur, birim: i.birim, satis: decimal(i.satisKurus), aciklama: i.aciklama }); setError(""); setOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const raw = form.satis.trim().replace(/\s/g, "");
    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const value = normalized ? Number(normalized) : 0;
    if (!Number.isFinite(value) || value < 0 || Math.abs(Math.round(value * 100) - value * 100) > 0.00001) { setError("Geçerli bir satış tutarı girin (en fazla iki ondalık)."); return; }
    setSaving(true); setError("");
    try { const res = await fetch("/api/products", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editing, satisKurus: Math.round(value * 100) }) }); const data = await res.json() as any; if (!res.ok) throw new Error(data.error); setOpen(false); await refresh(); toast.success(editing ? "Kart güncellendi." : "Kart kaydedildi."); }
    catch (e) { setError(e instanceof Error ? e.message : "Kart kaydedilemedi."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { const res = await fetch("/api/products?id=" + deleting.id, { method: "DELETE" }); const data = await res.json() as any; if (!res.ok) throw new Error(data.error); setDeleting(null); await refresh(); toast.success("Kart silindi."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Kart silinemedi."); }
  };

  return <div className="min-h-screen bg-[#f4f7fa] text-[#16283b]">
    <Toaster position="top-right" richColors />
    <header className="border-b border-[#dce5ed] bg-[#102b43] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4 md:px-8"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7891] font-bold tracking-tight"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="h-10 w-10 rounded-xl" /></div><div className="leading-tight"><div className="text-base font-semibold">Cari Hesap</div><div className="text-xs text-[#b9d0de]">Takip Programı</div></div><nav className="ml-auto flex flex-wrap gap-1 text-sm"><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/">Ana Ekran</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/cariler/">Cari Kartları</a><a aria-current="page" className="rounded-lg bg-white/15 px-3 py-2 font-medium" href="/urun-hizmet/">Ürün/Hizmet Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/hareketler/">Hareketler</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/raporlar/">Raporlar</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/ayarlar/">Ayarlar</a></nav></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12"><div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-sm font-semibold text-[#1b7891]">KART YÖNETİMİ</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Ürün/Hizmet Kartları</h1><p className="mt-2 text-[#607387]">Ürün ve hizmetlerinizi kaydedin ve düzenleyin.</p></div><Button onClick={startNew} className="h-11 bg-[#087c94] px-5 text-white hover:bg-[#09677c]"><Plus className="mr-2 h-4 w-4" /> Yeni Kart Ekle</Button></div>
      <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e3eaf0] p-5"><h2 className="text-lg font-semibold">Kayıtlı Kartlar <span className="ml-2 text-sm font-normal text-[#607387]">{items.length}</span></h2><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71859a]" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ürün veya hizmet ara" aria-label="Ürün veya hizmet ara" className="h-10 pl-10" /></div></div>
      {loadError ? <div className="p-10 text-center"><p className="mb-3 text-red-700">{loadError}</p><Button variant="outline" onClick={() => void refresh()}>Yeniden dene</Button></div> : loading ? <p className="p-10 text-center text-[#607387]">Kartlar yükleniyor…</p> : !filtered.length ? <div className="p-12 text-center"><Package className="mx-auto mb-4 h-9 w-9 text-[#9fb5c4]" /><p className="font-medium">{query ? "Aramanızla eşleşen kart yok." : "Henüz ürün veya hizmet kartı yok."}</p>{!query && <Button variant="outline" className="mt-5" onClick={startNew}>Yeni Kart Ekle</Button>}</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f8fafc]"><TableHead className="pl-5">Kart No / Adı</TableHead><TableHead>Tür</TableHead><TableHead>Birim</TableHead><TableHead>Açıklama</TableHead><TableHead className="text-right">Satış Tutarı</TableHead><TableHead className="pr-5 text-right">İşlem</TableHead></TableRow></TableHeader><TableBody>{filtered.map(i => <TableRow key={i.id}><TableCell className="pl-5"><span className="block text-xs text-[#71859a]">UH-{String(i.id).padStart(4, "0")}</span><span className="font-medium">{i.ad}</span></TableCell><TableCell><span className="rounded-full bg-[#e5f4f7] px-3 py-1 text-sm text-[#08687d]">{i.tur === "urun" ? "Ürün" : "Hizmet"}</span></TableCell><TableCell>{i.birim}</TableCell><TableCell className="max-w-64 truncate text-[#607387]" title={i.aciklama}>{i.aciklama || "—"}</TableCell><TableCell className="text-right font-medium tabular-nums">{money(i.satisKurus)}</TableCell><TableCell className="pr-5 text-right"><Button size="icon" variant="ghost" aria-label={`${i.ad} düzenle`} onClick={() => startEdit(i)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`${i.ad} sil`} onClick={() => setDeleting(i)} className="text-red-700 hover:text-red-800"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>}</section>
    </main>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Ürün/Hizmet Kartını Düzenle" : "Yeni Ürün/Hizmet Kartı"}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-5"><label className="block text-sm font-medium">Ürün / Hizmet Adı<Input autoFocus className="mt-1.5" value={form.ad} onChange={e => update("ad", e.target.value)} required /></label><div className="text-sm font-medium">Tür<RadioGroup className="mt-3 flex gap-6" value={form.tur} onValueChange={v => update("tur", v)}><label className="flex items-center gap-2"><RadioGroupItem value="urun" /> Ürün</label><label className="flex items-center gap-2"><RadioGroupItem value="hizmet" /> Hizmet</label></RadioGroup></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Birim<Input className="mt-1.5" value={form.birim} onChange={e => update("birim", e.target.value)} placeholder="Adet, saat, ay…" required /></label><label className="text-sm font-medium">Satış Tutarı (₺)<Input className="mt-1.5" value={form.satis} onChange={e => update("satis", e.target.value)} placeholder="0,00" inputMode="decimal" /></label></div><label className="block text-sm font-medium">Açıklama<Textarea className="mt-1.5" value={form.aciklama} onChange={e => update("aciklama", e.target.value)} rows={3} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button><Button type="submit" disabled={saving} className="bg-[#087c94] text-white hover:bg-[#09677c]">{saving ? "Kaydediliyor…" : "Kaydet"}</Button></div></form></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Kart silinsin mi?</AlertDialogTitle><AlertDialogDescription>{deleting?.ad} kartı kalıcı olarak silinecek.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} className="bg-red-700 text-white hover:bg-red-800">Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

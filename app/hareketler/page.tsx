"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast, Toaster } from "sonner";

type Client = { id: number; ad: string; soyad: string; bakiyeKurus: number; yon: "borc" | "alacak" };
type Product = { id: number; ad: string; tur: string; satisKurus: number };
type Movement = { id: number; clientId: number; productId: number | null; productAd: string | null; tarih: string; yon: "borc" | "alacak"; tutarKurus: number; aciklama: string };
type Form = { clientId: string; productId: string; tarih: string; yon: "borc" | "alacak"; tutar: string; aciklama: string };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(k / 100);
const decimal = (k: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(k / 100);
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const empty = (): Form => ({ clientId: "", productId: "none", tarih: today(), yon: "borc", tutar: "", aciklama: "" });

export default function MovementsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Movement | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const responses = await Promise.all(["/api/clients", "/api/products", "/api/movements"].map(u => fetch(u, { cache: "no-store" })));
      const data = await Promise.all(responses.map(r => r.json())) as any[];
      const failed = responses.findIndex(r => !r.ok);
      if (failed >= 0) throw new Error(data[failed].error);
      setClients(data[0].clients); setProducts(data[1].products); setItems(data[2].movements); setLoadError("");
    } catch { setLoadError("Hareketler yüklenemedi. Tekrar deneyin."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("cari"); if (id && /^\d+$/.test(id)) setFilterClient(id); }, []);
  const clientName = (id: number) => { const c = clients.find(x => x.id === id); return c ? [c.ad, c.soyad].filter(Boolean).join(" ") : "Silinmiş cari"; };
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase("tr-TR"); return items.filter(i => (filterClient === "all" || i.clientId === Number(filterClient)) && (!q || [i.aciklama, i.productAd || "", clientName(i.clientId)].some(v => v.toLocaleLowerCase("tr-TR").includes(q)))); }, [items, clients, filterClient, query]);
  const selectedClient = filterClient === "all" ? null : clients.find(c => c.id === Number(filterClient));
  const net = selectedClient ? (selectedClient.yon === "borc" ? selectedClient.bakiyeKurus : -selectedClient.bakiyeKurus) + items.filter(i => i.clientId === selectedClient.id).reduce((s, i) => s + (i.yon === "borc" ? i.tutarKurus : -i.tutarKurus), 0) : 0;
  const startNew = () => { setEditing(null); setForm({ ...empty(), clientId: filterClient === "all" ? "" : filterClient }); setError(""); setOpen(true); };
  const startEdit = (i: Movement) => { setEditing(i.id); setForm({ clientId: String(i.clientId), productId: i.productId ? String(i.productId) : "none", tarih: i.tarih, yon: i.yon, tutar: decimal(i.tutarKurus), aciklama: i.aciklama }); setError(""); setOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.clientId) { setError("Cari seçin."); return; }
    const raw = form.tutar.trim().replace(/\s/g, "");
    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const value = Number(normalized);
    if (!normalized || !Number.isFinite(value) || value <= 0 || Math.abs(Math.round(value * 100) - value * 100) > 0.00001) { setError("Sıfırdan büyük, en fazla iki ondalıklı bir tutar girin."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/movements", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editing, clientId: Number(form.clientId), productId: form.productId === "none" ? null : Number(form.productId), tutarKurus: Math.round(value * 100) }) });
      const data = await res.json() as any; if (!res.ok) throw new Error(data.error);
      setOpen(false); await refresh(); toast.success(editing ? "Hareket güncellendi." : "Hareket kaydedildi.");
    } catch (e) { setError(e instanceof Error ? e.message : "Hareket kaydedilemedi."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { const res = await fetch("/api/movements?id=" + deleting.id, { method: "DELETE" }); const data = await res.json() as any; if (!res.ok) throw new Error(data.error); setDeleting(null); await refresh(); toast.success("Hareket silindi."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Hareket silinemedi."); }
  };
  return <div className="min-h-screen bg-[#f4f7fa] text-[#16283b]">
    <Toaster position="top-right" richColors />
    <header className="border-b border-[#dce5ed] bg-[#102b43] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4 md:px-8"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7891] font-bold tracking-tight"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="h-10 w-10 rounded-xl" /></div><div className="leading-tight"><div className="text-base font-semibold">Cari Hesap</div><div className="text-xs text-[#b9d0de]">Takip Programı</div></div><nav className="ml-auto flex flex-wrap gap-1 text-sm"><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/">Ana Ekran</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/cariler/">Cari Kartları</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/urun-hizmet/">Ürün/Hizmet Kartları</a><a aria-current="page" className="rounded-lg bg-white/15 px-3 py-2 font-medium" href="/hareketler/">Hareketler</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/raporlar/">Raporlar</a><a className="rounded-lg px-3 py-2 text-[#d8e8ef] hover:bg-white/10" href="/ayarlar/">Ayarlar</a></nav></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12"><div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-sm font-semibold text-[#1b7891]">CARİ İŞLEMLER</p><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Hareketler</h1><p className="mt-2 text-[#607387]">Borç ve alacak işlemlerini carilere kaydedin.</p></div><Button onClick={startNew} disabled={!clients.length} className="h-11 bg-[#087c94] px-5 text-white hover:bg-[#09677c]"><Plus className="mr-2 h-4 w-4" /> Yeni Hareket</Button></div>
      <section className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white shadow-sm"><div className="flex flex-wrap items-end gap-4 border-b border-[#e3eaf0] p-5"><div className="min-w-52 flex-1"><label className="mb-1.5 block text-sm font-medium">Cari filtrele</label><Select value={filterClient} onValueChange={setFilterClient}><SelectTrigger className="w-full"><SelectValue placeholder="Tüm cariler" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm cariler</SelectItem>{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.ad} {c.soyad}</SelectItem>)}</SelectContent></Select></div><div className="relative min-w-52 flex-1"><label className="mb-1.5 block text-sm font-medium">Hareket ara</label><Search className="absolute bottom-2.5 left-3 h-4 w-4 text-[#71859a]" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Açıklama veya ürün/hizmet" className="pl-10" /></div>{selectedClient && <div className="rounded-xl bg-[#e5f4f7] px-5 py-2 text-sm"><span className="text-[#607387]">Güncel bakiye</span><strong className="ml-3 text-[#08687d]">{money(Math.abs(net))} {net === 0 ? "Sıfır" : net > 0 ? "Borç" : "Alacak"}</strong></div>}</div>
      {loadError ? <div className="p-10 text-center"><p className="mb-3 text-red-700">{loadError}</p><Button variant="outline" onClick={() => void refresh()}>Yeniden dene</Button></div> : loading ? <p className="p-10 text-center text-[#607387]">Hareketler yükleniyor…</p> : !filtered.length ? <div className="p-12 text-center"><ArrowLeftRight className="mx-auto mb-4 h-9 w-9 text-[#9fb5c4]" /><p className="font-medium">{query || filterClient !== "all" ? "Bu seçimde hareket bulunamadı." : "Henüz hareket kaydı yok."}</p>{!query && !items.length && <Button variant="outline" className="mt-5" onClick={startNew} disabled={!clients.length}>Yeni Hareket</Button>}{!clients.length && <p className="mt-3 text-sm text-[#607387]">Önce Cari Kartları bölümünden cari ekleyin.</p>}</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f8fafc]"><TableHead className="pl-5">Tarih</TableHead><TableHead>Cari</TableHead><TableHead>Ürün/Hizmet</TableHead><TableHead>Açıklama</TableHead><TableHead>Tür</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead className="pr-5 text-right">İşlem</TableHead></TableRow></TableHeader><TableBody>{filtered.map(i => <TableRow key={i.id}><TableCell className="pl-5 whitespace-nowrap">{new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC" }).format(new Date(i.tarih + "T12:00:00Z"))}</TableCell><TableCell className="font-medium">{clientName(i.clientId)}</TableCell><TableCell>{i.productAd || "—"}</TableCell><TableCell className="max-w-64 truncate text-[#607387]" title={i.aciklama}>{i.aciklama || "—"}</TableCell><TableCell><span className={`rounded-full px-3 py-1 text-sm ${i.yon === "borc" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>{i.yon === "borc" ? "Borç" : "Alacak"}</span></TableCell><TableCell className="text-right font-medium tabular-nums">{money(i.tutarKurus)}</TableCell><TableCell className="pr-5 text-right"><Button size="icon" variant="ghost" aria-label="Hareketi düzenle" onClick={() => startEdit(i)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Hareketi sil" onClick={() => setDeleting(i)} className="text-red-700 hover:text-red-800"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>}</section>
    </main>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Hareketi Düzenle" : "Yeni Hareket"}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-5"><div><label className="mb-1.5 block text-sm font-medium">Cari *</label><Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}><SelectTrigger className="w-full"><SelectValue placeholder="Cari seçin" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.ad} {c.soyad}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1.5 block text-sm font-medium">Ürün/Hizmet Kartı</label><Select value={form.productId} onValueChange={v => { const p = products.find(x => String(x.id) === v); setForm(f => ({ ...f, productId: v, tutar: p ? decimal(p.satisKurus) : f.tutar })); }}><SelectTrigger className="w-full"><SelectValue placeholder="Kart seçin" /></SelectTrigger><SelectContent><SelectItem value="none">Kart seçmeden devam et</SelectItem>{products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.ad} ({p.tur === "urun" ? "Ürün" : "Hizmet"})</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-[#607387]">Kart seçildiğinde satış tutarı önerilir.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">İşlem Tarihi<Input className="mt-1.5" type="date" required value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} /></label><label className="text-sm font-medium">Tutar (₺)<Input className="mt-1.5" inputMode="decimal" required placeholder="0,00" value={form.tutar} onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))} /></label></div><div className="text-sm font-medium">İşlem Yönü<RadioGroup className="mt-3 flex gap-6" value={form.yon} onValueChange={v => setForm(f => ({ ...f, yon: v as Form["yon"] }))}><label className="flex items-center gap-2"><RadioGroupItem value="borc" /> Borç</label><label className="flex items-center gap-2"><RadioGroupItem value="alacak" /> Alacak</label></RadioGroup></div><label className="block text-sm font-medium">Açıklama<Textarea className="mt-1.5" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} rows={3} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button><Button type="submit" disabled={saving} className="bg-[#087c94] text-white hover:bg-[#09677c]">{saving ? "Kaydediliyor…" : "Kaydet"}</Button></div></form></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hareket silinsin mi?</AlertDialogTitle><AlertDialogDescription>Bu işlem cari bakiyesinden çıkarılacak. Silme işlemi geri alınamaz.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} className="bg-red-700 text-white hover:bg-red-800">Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

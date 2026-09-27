"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Client = { id: number; ad: string; soyad: string; telefon: string };
type Movement = { id: number; tarih: string; yon: "borc" | "alacak"; tutarKurus: number; productAd: string | null; aciklama: string };
type Props = { client: Client; period: string; opening: number; borc: number; alacak: number; closing: number; movements: Movement[] };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Math.abs(k) / 100);
const balance = (k: number) => k === 0 ? money(0) + " Sıfır" : money(k) + (k > 0 ? " Borç" : " Alacak");

function internationalPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^05\d{9}$/.test(digits)) digits = "90" + digits.slice(1);
  else if (/^5\d{9}$/.test(digits)) digits = "90" + digits;
  return /^\d{8,15}$/.test(digits) && !digits.startsWith("0") ? digits : "";
}

export function WhatsAppShare({ client, period, opening, borc, alacak, closing, movements }: Props) {
  const [open, setOpen] = useState(false);
  const phone = internationalPhone(client.telefon || "");
  const shown = movements.slice(0, 30);
  const text = [
    "Cari Hesap Takip Programı", "Cari Bakiye Raporu",
    `${client.ad} ${client.soyad}`.trim(), `Dönem: ${period}`,
    `Dönem başı: ${balance(opening)}`, `Borç hareketleri: ${money(borc)}`,
    `Alacak hareketleri: ${money(alacak)}`, `Dönem sonu: ${balance(closing)}`,
    `Hareket ayrıntıları (${movements.length}):`,
    ...shown.map(m => `${m.tarih.split("-").reverse().join(".")} | ${m.yon === "borc" ? "Borç" : "Alacak"} ${money(m.tutarKurus)}${m.productAd ? " | " + m.productAd : ""}${m.aciklama ? " | " + m.aciklama : ""}`),
    ...(movements.length > shown.length ? [`İlk ${shown.length} hareket gösterildi. Raporun tamamı için PDF çıktısını ayrıca paylaşın.`] : []),
  ].join("\n");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="whitespace-nowrap text-[#087c94]"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>WhatsApp rapor taslağı</DialogTitle></DialogHeader>
      <p className="text-sm">Alıcı: <strong>{client.ad} {client.soyad}</strong> · {client.telefon || "Telefon kayıtlı değil"}</p>
      {!phone ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Cari kartında geçerli bir telefon numarası bulunmuyor. Önce <a className="underline" href="/cariler/">Cari Kartları</a> ekranından numarayı ekleyin.</p> : <p className="text-sm text-[#607387]">Numarayı ve mesajı kontrol edin. WhatsApp açıldıktan sonra gönderme işlemini siz tamamlayın.</p>}
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f4f7fa] p-3 font-sans text-sm">{text}</pre>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>{phone && <Button className="bg-[#087c94] text-white hover:bg-[#09677c]" asChild><a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>WhatsApp’ta Aç</a></Button>}</div>
    </DialogContent></Dialog>
  </>;
}

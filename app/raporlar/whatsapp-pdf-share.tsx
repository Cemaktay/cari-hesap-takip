"use client";

import { useEffect, useState } from "react";
import { FileDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Client = { id: number; ad: string; soyad: string; telefon: string };
type Movement = { id: number; tarih: string; yon: "borc" | "alacak"; tutarKurus: number; productAd: string | null; aciklama: string };
type Props = { client: Client; period: string; opening: number; borc: number; alacak: number; closing: number; movements: Movement[] };
const money = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Math.abs(k) / 100);
const balance = (k: number) => k === 0 ? money(0) + " Sıfır" : money(k) + (k > 0 ? " Borç" : " Alacak");

function phoneNumber(raw: string) {
  let number = raw.replace(/\D/g, "");
  if (number.startsWith("00")) number = number.slice(2);
  if (/^05\d{9}$/.test(number)) number = "90" + number.slice(1);
  else if (/^5\d{9}$/.test(number)) number = "90" + number;
  return /^\d{8,15}$/.test(number) && !number.startsWith("0") ? number : "";
}

async function makePdf({ client, period, opening, borc, alacak, closing, movements }: Props) {
  const [{ jsPDF }, fontResponse] = await Promise.all([import("jspdf"), fetch("/fonts/DejaVuSans.ttf")]);
  if (!fontResponse.ok) throw new Error("PDF yazı tipi yüklenemedi.");
  const fontBytes = new Uint8Array(await fontResponse.arrayBuffer());
  let binary = "";
  for (let i = 0; i < fontBytes.length; i += 8192) binary += String.fromCharCode(...fontBytes.subarray(i, i + 8192));
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addFileToVFS("DejaVuSans.ttf", btoa(binary));
  pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  pdf.setFont("DejaVu", "normal");
  const margin = 18, width = 174, bottom = 278;
  let y = 22;
  const write = (value: string, size = 10, gap = 5.6) => {
    pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(value, width) as string[]) {
      if (y + gap > bottom) { pdf.addPage(); y = 22; }
      pdf.text(line, margin, y);
      y += gap;
    }
  };
  write("CARİ HESAP TAKİP PROGRAMI", 13, 8);
  write("Cari Hesap Ekstresi", 17, 11);
  write(`Mükellef: ${client.ad} ${client.soyad}`.trim(), 11, 7);
  write(`Dönem: ${period}`, 10, 8);
  write(`Dönem Başı: ${balance(opening)}`, 10, 7);
  write(`Dönem Borç: ${money(borc)}    Dönem Alacak: ${money(alacak)}`, 10, 7);
  write(`Dönem Sonu: ${balance(closing)}`, 11, 9);
  write(`Hareket Ayrıntıları (${movements.length})`, 11, 8);
  if (!movements.length) write("Bu dönemde hareket yok.");
  for (const movement of movements) {
    const line = `${movement.tarih.split("-").reverse().join(".")}  |  ${movement.yon === "borc" ? "Borç" : "Alacak"}  |  ${money(movement.tutarKurus)}`;
    if (y + 18 > bottom) { pdf.addPage(); y = 22; }
    write(line, 9, 5.5);
    if (movement.productAd) write(`Ürün/Hizmet: ${movement.productAd}`, 8, 4.8);
    if (movement.aciklama) write(`Açıklama: ${movement.aciklama}`, 8, 4.8);
    y += 3;
  }
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page); pdf.setFontSize(8); pdf.text(`${page} / ${count}`, 192, 287, { align: "right" });
  }
  const name = `Cari_Ekstre_CR-${String(client.id).padStart(4, "0")}_${period.replace(/[^\dA-Za-z]+/g, "-")}.pdf`;
  return new File([pdf.output("blob")], name, { type: "application/pdf" });
}

export function WhatsAppPdfShare(props: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const phone = phoneNumber(props.client.telefon || "");
  const name = `${props.client.ad} ${props.client.soyad}`.trim();
  const message = `Sayın ${name}; Cari hesap ekstreniz ektedir. Bilginize.`;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void makePdf(props).then(result => { if (!cancelled) setFile(result); }).catch(() => { if (!cancelled) setError("PDF hazırlanamadı. Tekrar deneyin."); });
    return () => { cancelled = true; };
    // PDF is prepared from the report visible when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare?.({ files: [file] });
  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setDownloaded(true);
  };
  return <>
    <Button size="sm" variant="outline" className="whitespace-nowrap text-[#087c94]" onClick={() => { setFile(null); setError(""); setDownloaded(false); setOpen(true); }}><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp PDF Gönder</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>WhatsApp için PDF ekstre</DialogTitle></DialogHeader>
      <p className="text-sm">Alıcı: <strong>{name}</strong> · {props.client.telefon || "Telefon kayıtlı değil"}</p>
      {!phone && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Cari kartında geçerli telefon yok. <a href="/cariler/" className="underline">Cari Kartları</a> ekranından numarayı düzenleyin.</p>}
      <p className="rounded-lg bg-[#f4f7fa] p-3 text-sm">{message}</p>
      <p className="text-sm text-[#607387]">{error || (!file ? "PDF hazırlanıyor…" : `${file.name} · ${props.movements.length} hareket`)}</p>
      {canShareFile ? <><p className="text-sm text-[#607387]">Paylaşım menüsünde WhatsApp’ı ve doğru alıcıyı seçin. Mesajı kontrol edip gönderin.</p><Button disabled={!phone} onClick={() => { if (file) void navigator.share({ files: [file], text: message, title: file.name }).catch(e => { if (e?.name !== "AbortError") setError("Cihaz paylaşımı açılamadı. PDF’yi indirerek devam edin."); }); }} className="bg-[#087c94] text-white hover:bg-[#09677c]">PDF’yi Paylaş</Button></> : <p className="text-sm text-[#607387]">Önce PDF’yi indirin. Ardından WhatsApp sohbetindeki ataç simgesiyle bu PDF’yi ekleyin; hazır mesajı ve dosyayı kontrol edip gönderin.</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Kapat</Button>{file && <Button variant="outline" onClick={download}><FileDown className="mr-1.5 h-4 w-4" /> PDF’yi İndir</Button>}{file && phone && downloaded && <Button asChild className="bg-[#087c94] text-white hover:bg-[#09677c]"><a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Sohbeti Aç ve PDF’yi Ekle</a></Button>}</div>
    </DialogContent></Dialog>
  </>;
}

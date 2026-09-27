"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SetupPage() {
  const [needed, setNeeded] = useState<boolean | null>(null);
  const [setupKey, setSetupKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/auth/setup", { cache: "no-store" }).then(r => r.json()).then(data => setNeeded(!!(data as { needed?: boolean }).needed)).catch(() => setError("Kurulum durumu okunamadı.")); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (password !== repeat) { setError("Şifreler eşleşmiyor."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupKey, username, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Kurulum yapılamadı.");
      window.location.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Kurulum yapılamadı."); setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f7fa] px-5 py-12 text-[#16283b]"><div className="w-full max-w-md rounded-2xl border border-[#dce5ed] bg-white p-8 shadow-lg"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="mb-5 h-12 w-12" /><h1 className="text-2xl font-semibold">İlk Kurulum</h1><p className="mt-2 text-sm text-[#607387]">Bu kurulumun verileri yalnızca kendi veritabanında tutulur. Cari, ürün/hizmet ve hareket listeleri boş başlar.</p>
    {needed === false ? <p className="mt-6 text-sm">Kurulum tamamlanmış. <a className="font-medium text-[#087c94] underline" href="/giris/">Giriş ekranına dön</a>.</p> : needed === null ? <p className="mt-6 text-sm">Kontrol ediliyor…</p> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Kurulum Anahtarı<Input className="mt-1.5" type="password" autoComplete="off" value={setupKey} onChange={e => setSetupKey(e.target.value)} required /></label><label className="block text-sm font-medium">Kullanıcı Adı<Input className="mt-1.5" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} /></label><label className="block text-sm font-medium">Şifre (en az 12 karakter)<Input className="mt-1.5" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} /></label><label className="block text-sm font-medium">Şifre Tekrar<Input className="mt-1.5" type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} required /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy} className="w-full bg-[#087c94] text-white hover:bg-[#09677c]">{busy ? "Kuruluyor…" : "Hesabımı Oluştur"}</Button></form>}
  </div></main>;
}

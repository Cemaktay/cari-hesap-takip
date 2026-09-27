"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccountPage() {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json() as Promise<{ username?: string }>).then(d => { setUsername(d.username ?? ""); }); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirm) { setError("Yeni şifreler eşleşmiyor."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/credentials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, currentPassword, newPassword }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      window.location.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Bilgiler güncellenemedi."); setBusy(false); }
  };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.replace("/giris/"); };
  return <div className="min-h-screen bg-[#f4f7fa] text-[#16283b]"><header className="bg-[#102b43] px-5 py-4 text-white"><div className="mx-auto flex max-w-3xl items-center justify-between"><span className="font-semibold">Cari Hesap · Ayarlar</span><a className="text-sm underline" href="/">Ana Ekran</a></div></header><main className="mx-auto max-w-xl px-5 py-10"><div className="rounded-2xl border border-[#dce5ed] bg-white p-6 shadow-sm md:p-8"><h1 className="text-2xl font-semibold">Kullanıcı Adı ve Şifre</h1><p className="mt-2 text-[#607387]">Giriş bilgilerinizi buradan değiştirebilirsiniz.</p><form onSubmit={save} className="mt-7 space-y-5"><label className="block text-sm font-medium">Yeni Kullanıcı Adı<Input className="mt-1.5 h-11" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label><label className="block text-sm font-medium">Mevcut Şifre<Input className="mt-1.5 h-11" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label><label className="block text-sm font-medium">Yeni Şifre<Input className="mt-1.5 h-11" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></label><label className="block text-sm font-medium">Yeni Şifre Tekrar<Input className="mt-1.5 h-11" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy} className="h-11 w-full bg-[#087c94] text-white hover:bg-[#09677c]">{busy ? "Kaydediliyor…" : "Bilgileri Kaydet"}</Button></form><button type="button" onClick={() => void logout()} className="mt-6 text-sm font-medium text-[#607387] underline">Çıkış Yap</button></div></main></div>;
}

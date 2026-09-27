"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  useEffect(() => { void fetch("/api/auth/setup", { cache: "no-store" }).then(r => r.json()).then(data => setSetupNeeded(!!(data as { needed?: boolean }).needed)).catch(() => {}); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      window.location.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Giriş yapılamadı."); setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f7fa] px-5 py-12 text-[#16283b]"><div className="w-full max-w-md rounded-2xl border border-[#dce5ed] bg-white p-8 shadow-lg"><div className="mb-7 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#102b43] text-white"><img src="/cari-logo.svg" alt="Cari Hesap logosu" className="h-12 w-12 rounded-xl" /></div><div><h1 className="text-2xl font-semibold">Cari Hesap Takip Programı</h1><p className="text-sm text-[#607387]">Kullanıcı Girişi</p></div></div>{setupNeeded && <div className="mb-5 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">İlk kurulum henüz yapılmadı. <a className="font-semibold underline" href="/kurulum/">Kendi hesabınızı oluşturun</a>.</div>}<form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium">Kullanıcı Adı<Input autoComplete="username" className="mt-1.5 h-11" value={username} onChange={e => setUsername(e.target.value)} required /></label><label className="block text-sm font-medium">Şifre<Input autoComplete="current-password" type="password" className="mt-1.5 h-11" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy} className="h-11 w-full bg-[#087c94] text-white hover:bg-[#09677c]">{busy ? "Giriş yapılıyor…" : "Giriş Yap"}</Button></form></div></main>;
}

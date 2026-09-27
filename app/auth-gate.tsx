"use client";

import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const path = window.location.pathname;
    fetch("/api/auth/session", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("session");
      return response.json() as Promise<{ authenticated: boolean }>;
    }).then(session => {
      if (!active) return;
      const target = !session.authenticated ? "/giris/" : path === "/giris/" || path === "/giris" ? "/" : null;
      if (target && path !== target && path !== target.slice(0, -1)) { window.location.replace(target); return; }
      setReady(true);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (failed) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f7fa] text-[#16283b]"><p>Oturum kontrol edilemedi.</p><button className="rounded-lg bg-[#087c94] px-4 py-2 text-white" onClick={() => window.location.reload()}>Yeniden dene</button></div>;
  return ready ? <>{children}</> : <div className="flex min-h-screen items-center justify-center bg-[#f4f7fa] text-[#607387]">Oturum kontrol ediliyor…</div>;
}

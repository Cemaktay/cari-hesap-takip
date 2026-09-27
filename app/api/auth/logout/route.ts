import { clearCookie, logout, sameOrigin } from "../../../auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Geçersiz istek." }, { status: 403 });
  try { await logout(request); return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie(), "Cache-Control": "no-store" } }); }
  catch (error) { console.error(error); return Response.json({ error: "Çıkış yapılamadı." }, { status: 500 }); }
}

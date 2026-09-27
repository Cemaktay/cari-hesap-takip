import { login, sameOrigin, sessionCookie } from "../../../auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Geçersiz istek." }, { status: 403 });
  try {
    const body = await request.json() as { username?: string; password?: string };
    const result = await login(String(body.username ?? "").trim(), String(body.password ?? ""));
    if (!result) return Response.json({ error: "Kullanıcı adı veya şifre yanlış. Çok sayıda hatalı denemede giriş 15 dakika bekletilir." }, { status: 401 });
    return Response.json({ username: result.username }, { headers: { "Set-Cookie": sessionCookie(result.token), "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error); return Response.json({ error: "Giriş yapılamadı. Tekrar deneyin." }, { status: 500 });
  }
}

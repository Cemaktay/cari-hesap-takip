import { getSession, sameOrigin, sessionCookie, updateCredentials } from "../../../auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Geçersiz istek." }, { status: 403 });
  try {
    const account = await getSession(request);
    if (!account) return Response.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    const body = await request.json() as { currentPassword?: string; username?: string; newPassword?: string };
    const result = await updateCredentials(account, String(body.currentPassword ?? ""), String(body.username ?? "").trim(), String(body.newPassword ?? ""));
    if (typeof result === "string") return Response.json({ error: result }, { status: 400 });
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(result.token), "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error); return Response.json({ error: "Bilgiler güncellenemedi." }, { status: 500 });
  }
}

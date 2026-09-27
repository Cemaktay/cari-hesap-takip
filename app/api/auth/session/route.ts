import { getSession } from "../../../auth";

export async function GET(request: Request) {
  try {
    const account = await getSession(request);
    return Response.json({ authenticated: !!account, username: account?.username ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error); return Response.json({ error: "Oturum kontrol edilemedi." }, { status: 500 });
  }
}

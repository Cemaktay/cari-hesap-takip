import { requireAuth } from "../../auth";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { clients, movements } from "../../../db/schema";

export async function GET(request: Request) {
  const denied = await requireAuth(request); if (denied) return denied;
  try {
    const rows = await getDb().select({
      id: clients.id, ad: clients.ad, soyad: clients.soyad, telefon: clients.telefon,
      opening: clients.bakiyeKurus, openingDirection: clients.yon,
      movementNet: sql<number>`coalesce(sum(case when ${movements.yon} = 'borc' then ${movements.tutarKurus} else -${movements.tutarKurus} end), 0)`,
    }).from(clients).leftJoin(movements, eq(clients.id, movements.clientId)).groupBy(clients.id).orderBy(asc(clients.ad), asc(clients.soyad));
    return Response.json({ balances: rows.map(row => ({ ...row, net: (row.openingDirection === "borc" ? row.opening : -row.opening) + row.movementNet })) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Bakiyeler yüklenemedi." }, { status: 500 });
  }
}

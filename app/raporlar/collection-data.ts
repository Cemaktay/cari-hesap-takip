export type CollectionClient = { id: number; ad: string; soyad: string };
export type CollectionMovement = { id: number; clientId: number; tarih: string; yon: "borc" | "alacak"; tutarKurus: number; productAd: string | null; aciklama: string };
export type CollectionMode = "day" | "month" | "range";

export const formatDate = (date: string) => date.split("-").reverse().join(".");
export const formatMoney = (k: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(k / 100);
export const istanbulToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function collectionPeriod(mode: CollectionMode, day: string, month: string, start: string, end: string) {
  if (mode === "day") return { from: day, to: day, label: formatDate(day), valid: /^\d{4}-\d{2}-\d{2}$/.test(day) };
  if (mode === "month") {
    const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
    const last = valid ? String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0") : "00";
    return { from: month + "-01", to: month + "-" + last, label: valid ? `${month.slice(5)}.${month.slice(0, 4)}` : "", valid };
  }
  return { from: start, to: end, label: `${formatDate(start)} – ${formatDate(end)}`, valid: /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start <= end };
}
export function collectionRows(clients: CollectionClient[], movements: CollectionMovement[], from: string, to: string, selected: number[] | null) {
  const chosen = new Set(selected || []);
  const names = new Map(clients.map(c => [c.id, `${c.ad} ${c.soyad}`.trim()]));
  const included = new Set(clients.filter(c => selected === null || chosen.has(c.id)).map(c => c.id));
  const detail = movements.filter(m => m.yon === "alacak" && included.has(m.clientId) && m.tarih >= from && m.tarih <= to)
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id - a.id);
  const totals = new Map<number, { count: number; total: number }>();
  for (const m of detail) { const entry = totals.get(m.clientId) || { count: 0, total: 0 }; entry.count++; entry.total += m.tutarKurus; totals.set(m.clientId, entry); }
  const summary = [...totals].map(([id, value]) => ({ id, name: names.get(id) || "—", ...value })).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { detail, summary, names, total: detail.reduce((sum, m) => sum + m.tutarKurus, 0) };
}

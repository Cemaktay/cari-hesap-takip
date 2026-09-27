import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ad: text("ad").notNull(),
  soyad: text("soyad").notNull().default(""),
  telefon: text("telefon").notNull().default(""),
  vd: text("vd").notNull().default(""),
  vkn: text("vkn"),
  tc: text("tc"),
  email: text("email").notNull().default(""),
  bakiyeKurus: integer("bakiye_kurus").notNull().default(0),
  yon: text("yon").notNull().default("borc"),
}, (t) => [uniqueIndex("clients_vkn_unique").on(t.vkn), uniqueIndex("clients_tc_unique").on(t.tc)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ad: text("ad").notNull(),
  tur: text("tur").notNull(),
  birim: text("birim").notNull().default("Adet"),
  satisKurus: integer("satis_kurus").notNull().default(0),
  aciklama: text("aciklama").notNull().default(""),
});

export const movements = sqliteTable("movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  productId: integer("product_id").references(() => products.id),
  productAd: text("product_ad"),
  tarih: text("tarih").notNull(),
  yon: text("yon").notNull(),
  tutarKurus: integer("tutar_kurus").notNull(),
  aciklama: text("aciklama").notNull().default(""),
}, (t) => [index("movements_client_date_idx").on(t.clientId, t.tarih)]);

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  usernameNorm: text("username_norm").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: integer("locked_until").notNull().default(0),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  expiresAt: integer("expires_at").notNull(),
});

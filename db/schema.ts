import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adminCredentials = sqliteTable("admin_credentials", {
  id: integer("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  iterations: integer("iterations").notNull().default(100000),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("admin_sessions_expires_idx").on(table.expiresAt)],
);

export const loginAttempts = sqliteTable("login_attempts", {
  identifier: text("identifier").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
});

export const paymentBookState = sqliteTable("payment_book_state", {
  id: integer("id").primaryKey(),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "VENDOR", "USER"]);

// ACTIVE: visible in the public catalog. PAUSED: vendor-hidden but not
// deleted (e.g. temporarily fully booked). ARCHIVED: soft-deleted — used
// instead of a hard DELETE because existing orders reference a service via
// a foreign key with ON DELETE RESTRICT, so order history must still be
// able to show what was purchased even after a vendor stops offering it.
export const serviceStatusEnum = pgEnum("service_status", [
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

// ---------------------------------------------------------------------------
// Users — base identity table for all roles (Admin, Vendor, End-User)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [users.id],
    references: [vendorProfiles.userId],
  }),
  orders: many(orders),
}));

// ---------------------------------------------------------------------------
// Vendor Profiles — 1:1 extension of a User with role = VENDOR
// ---------------------------------------------------------------------------

export const vendorProfiles = pgTable("vendor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vendorProfilesRelations = relations(
  vendorProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [vendorProfiles.userId],
      references: [users.id],
    }),
    services: many(services),
    orders: many(orders),
  })
);

// ---------------------------------------------------------------------------
// Services — owned by a Vendor, browsable in the marketplace catalog
// ---------------------------------------------------------------------------

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  // Nullable: a service is fully valid without one, and the UI falls back
  // to a category-based stock photo when this is empty (see lib/images.ts).
  imageUrl: text("image_url"),
  // Estimated job duration in minutes, shown on the catalog card (e.g.
  // "120m"). Nullable for services where duration doesn't apply/vary.
  durationMinutes: integer("duration_minutes"),
  status: serviceStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const servicesRelations = relations(services, ({ one, many }) => ({
  vendor: one(vendorProfiles, {
    fields: [services.vendorId],
    references: [vendorProfiles.id],
  }),
  orders: many(orders),
}));

// ---------------------------------------------------------------------------
// Orders — a checkout/booking event linking a buyer (User), a Service, and
// the owning Vendor, plus mock-payment-gateway fields. `priceAtBooking`
// snapshots the service price at purchase time so later vendor price edits
// never retroactively change a buyer's historical order total.
// ---------------------------------------------------------------------------

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "restrict" }),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  priceAtBooking: numeric("price_at_booking", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  mockPaymentReference: varchar("mock_payment_reference", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ one }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
  vendor: one(vendorProfiles, {
    fields: [orders.vendorId],
    references: [vendorProfiles.id],
  }),
}));

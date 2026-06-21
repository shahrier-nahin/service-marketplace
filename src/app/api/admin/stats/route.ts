import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, vendorProfiles, orders } from "@/db/schema";

// Platform commission rate applied to COMPLETED + PAID orders only — pending
// or cancelled orders haven't actually generated revenue for the platform
// yet, so they're deliberately excluded from this figure. This mirrors how
// a real marketplace would only recognize commission once a job is
// confirmed delivered and payment has actually settled.
const COMMISSION_RATE = 0.1;

// Reached only after the proxy confirms ADMIN role (path is under
// /api/admin/*). Aggregates several real queries into one dashboard
// payload rather than the frontend making four separate round trips.
export async function GET() {
  const [userCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const [vendorCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorProfiles);

  const [orderCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);

  // Platform revenue: commission on completed + paid orders only.
  const [revenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${orders.priceAtBooking}), 0)`,
    })
    .from(orders)
    .where(sql`${orders.status} = 'COMPLETED' AND ${orders.paymentStatus} = 'PAID'`);
  const platformRevenue = Number(revenueRow?.total ?? 0) * COMMISSION_RATE;

  // Six-month bookings + revenue trend, grouped by calendar month. Built
  // with a generated month series (not just grouping existing orders) so
  // months with zero orders still appear as a real zero on the chart,
  // rather than silently disappearing.
  const trendRows = await db.execute<{
    month: string;
    bookings: number;
    revenue: string;
  }>(sql`
    WITH months AS (
      SELECT date_trunc('month', current_date - (n || ' months')::interval) AS month_start
      FROM generate_series(0, 5) AS n
    )
    SELECT
      to_char(months.month_start, 'Mon') AS month,
      count(orders.id)::int AS bookings,
      coalesce(sum(orders.price_at_booking) FILTER (
        WHERE orders.status = 'COMPLETED' AND orders.payment_status = 'PAID'
      ), 0) AS revenue
    FROM months
    LEFT JOIN orders
      ON date_trunc('month', orders.created_at) = months.month_start
    GROUP BY months.month_start
    ORDER BY months.month_start ASC
  `);

  const trend = trendRows.rows.map((r) => ({
    month: r.month,
    bookings: Number(r.bookings),
    revenue: Number(r.revenue) * COMMISSION_RATE,
  }));

  // Booking status breakdown (donut chart) — counts grouped by order
  // status across the whole platform.
  const statusRows = await db.execute<{ status: string; count: number }>(sql`
    SELECT status, count(*)::int AS count
    FROM orders
    GROUP BY status
  `);
  const statusBreakdown = statusRows.rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }));

  // Provider account states — vendors are implicitly "active" in this
  // schema (there's no separate vendor-suspension flag yet), so this
  // reports active vs. vendors with zero listings as a useful proxy for
  // "onboarded but not yet fully set up."
  const [vendorsWithServicesRow] = await db.execute<{ count: number }>(sql`
    SELECT count(DISTINCT vendor_id)::int AS count
    FROM services
    WHERE status = 'ACTIVE'
  `).then((r) => r.rows as { count: number }[]);

  const vendorsWithActiveServices = Number(vendorsWithServicesRow?.count ?? 0);
  const totalVendors = Number(vendorCountRow?.count ?? 0);
  const providerStates = [
    { state: "Active listings", count: vendorsWithActiveServices },
    {
      state: "No active listings",
      count: Math.max(totalVendors - vendorsWithActiveServices, 0),
    },
  ];

  return NextResponse.json({
    totals: {
      users: Number(userCountRow?.count ?? 0),
      providers: totalVendors,
      bookings: Number(orderCountRow?.count ?? 0),
      platformRevenue,
    },
    trend,
    statusBreakdown,
    providerStates,
  });
}

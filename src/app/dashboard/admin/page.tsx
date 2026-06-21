"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AdminOrder {
  id: string;
  status: string;
  paymentStatus: string;
  priceAtBooking: string;
  createdAt: string;
  service: { title: string };
  buyer: { name: string; email: string };
  vendor: { businessName: string };
}

interface AdminStats {
  totals: {
    users: number;
    providers: number;
    bookings: number;
    platformRevenue: number;
  };
  trend: { month: string; bookings: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  providerStates: { state: string; count: number }[];
}

type Tab = "users" | "orders";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  VENDOR: "bg-blue-100 text-blue-800",
  USER: "bg-neutral-100 text-neutral-700",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#a3a3a3",
};

const PROVIDER_STATE_COLORS = ["#10b981", "#f59e0b"];

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let isMounted = true;
    (async () => {
      const [usersData, ordersData, statsData] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/orders", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (isMounted) {
        setUsers(usersData.users ?? []);
        setOrders(ordersData.orders ?? []);
        setStats(statsData);
        setLoadingData(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-semibold text-neutral-900">Admin dashboard</h1>
        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
          Live data
        </span>
      </div>
      <p className="text-neutral-600 mb-8">
        A live view of marketplace activity, revenue movement, and listings
        across the platform.
      </p>

      {loadingData || !stats ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-white border border-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total users"
              value={stats.totals.users.toLocaleString()}
              sublabel="Registered profiles"
              icon={<UsersIcon />}
              iconBg="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Providers"
              value={stats.totals.providers.toLocaleString()}
              sublabel="Active provider accounts"
              icon={<BriefcaseIcon />}
              iconBg="bg-purple-50 text-purple-600"
            />
            <StatCard
              label="Total bookings"
              value={stats.totals.bookings.toLocaleString()}
              sublabel="Marketplace orders"
              icon={<CalendarIcon />}
              iconBg="bg-green-50 text-green-600"
            />
            <StatCard
              label="Platform revenue"
              value={`$${stats.totals.platformRevenue.toFixed(2)}`}
              sublabel="Commission released"
              icon={<DollarIcon />}
              iconBg="bg-amber-50 text-amber-600"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-10">
            <div className="lg:col-span-2 rounded-lg border border-neutral-200 bg-white p-6">
              <p className="text-sm text-neutral-500">Bookings + revenue</p>
              <p className="font-semibold text-neutral-900 mb-4">Six month trend</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#737373" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#737373" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? [`$${Number(value ?? 0).toFixed(2)}`, "Revenue"]
                        : [value, "Bookings"]
                    }
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-xs text-neutral-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Bookings
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <p className="text-sm text-neutral-500">Booking mix</p>
              <p className="font-semibold text-neutral-900 mb-4">Status breakdown</p>
              {stats.statusBreakdown.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-sm text-neutral-400">
                  No bookings yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.statusBreakdown}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {stats.statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#a3a3a3"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-neutral-500 mt-2 justify-center">
                {stats.statusBreakdown.map((entry) => (
                  <span key={entry.status} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "#a3a3a3" }}
                    />
                    {entry.status.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6 mb-10">
            <p className="text-sm text-neutral-500">Provider health</p>
            <p className="font-semibold text-neutral-900 mb-4">Account states</p>
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats.providerStates}
                    dataKey="count"
                    nameKey="state"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {stats.providerStates.map((entry, i) => (
                      <Cell key={entry.state} fill={PROVIDER_STATE_COLORS[i % PROVIDER_STATE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {stats.providerStates.map((entry, i) => (
                  <div key={entry.state} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PROVIDER_STATE_COLORS[i % PROVIDER_STATE_COLORS.length] }}
                      />
                      {entry.state}
                    </span>
                    <span className="font-medium text-neutral-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            tab === "users"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            tab === "orders"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Orders
        </button>
      </div>

      {loadingData ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-white border border-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : tab === "users" ? (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{u.name}</p>
                <p className="text-xs text-neutral-500">{u.email}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_STYLES[u.role]}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{o.service.title}</p>
                <p className="text-xs text-neutral-500">
                  {o.buyer.name} → {o.vendor.businessName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-900">
                  ${Number(o.priceAtBooking).toFixed(2)}
                </p>
                <p className="text-xs text-neutral-500">{o.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-neutral-500">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{sublabel}</p>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface OrderItem {
  id: string;
  status: string;
  paymentStatus: string;
  priceAtBooking: string;
  createdAt: string;
  service: { title: string; category: string };
  vendor: { businessName: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-neutral-200 text-neutral-600",
};

export default function UserDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    fetch("/api/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16" />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
        Welcome back, {user.name.split(" ")[0]}
      </h1>
      <p className="text-neutral-600 mb-8">
        Here&apos;s a history of services you&apos;ve booked.
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-white border border-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-300 rounded-lg">
          <p className="text-neutral-600 mb-3">You haven&apos;t booked any services yet.</p>
          <Link href="/marketplace" className="text-sm font-medium underline underline-offset-2">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-neutral-900">{order.service.title}</p>
                <p className="text-sm text-neutral-500">
                  {order.vendor.businessName} · {order.service.category}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Booked {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <span className="font-semibold text-neutral-900">
                  ${Number(order.priceAtBooking).toFixed(2)}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

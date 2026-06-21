"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveServiceImage } from "@/lib/images";

interface VendorService {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string | null;
  durationMinutes: number | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
}

interface VendorOrder {
  id: string;
  status: string;
  paymentStatus: string;
  priceAtBooking: string;
  createdAt: string;
  service: { title: string };
  buyer: { name: string; email: string };
}

type Tab = "services" | "jobs";

const ORDER_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default function VendorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("services");

  const [services, setServices] = useState<VendorService[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoadingData(true);
    const [servicesRes, ordersRes] = await Promise.all([
      fetch("/api/vendor/services", { cache: "no-store" }),
      fetch("/api/vendor/orders", { cache: "no-store" }),
    ]);
    const servicesData = await servicesRes.json();
    const ordersData = await ordersRes.json();
    setServices(servicesData.services ?? []);
    setOrders(ordersData.orders ?? []);
    setLoadingData(false);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let isMounted = true;
    (async () => {
      const [servicesRes, ordersRes] = await Promise.all([
        fetch("/api/vendor/services", { cache: "no-store" }),
        fetch("/api/vendor/orders", { cache: "no-store" }),
      ]);
      const servicesData = await servicesRes.json();
      const ordersData = await ordersRes.json();
      if (isMounted) {
        setServices(servicesData.services ?? []);
        setOrders(ordersData.orders ?? []);
        setLoadingData(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  async function handleCreateService(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const res = await fetch("/api/vendor/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        price: Number(price),
        imageUrl: imageUrl || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setFormError(data.error ?? "Could not create the service.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("");
    setPrice("");
    setImageUrl("");
    setDurationMinutes("");
    setShowForm(false);
    setSubmitting(false);
    loadAll();
  }

  async function handleStatusChange(serviceId: string, status: VendorService["status"]) {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, status } : s))
    );
    await fetch(`/api/vendor/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleOrderStatusChange(orderId: string, status: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
        Vendor dashboard
      </h1>
      <p className="text-neutral-600 mb-8">
        Manage your listed services and track jobs as they come in.
      </p>

      <div className="flex gap-1 border-b border-neutral-200 mb-8">
        <button
          onClick={() => setTab("services")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            tab === "services"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          My services ({services.length})
        </button>
        <button
          onClick={() => setTab("jobs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            tab === "jobs"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Received jobs ({orders.length})
        </button>
      </div>

      {tab === "services" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {showForm ? "Cancel" : "+ List a new service"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleCreateService}
              className="rounded-lg border border-neutral-200 bg-white p-5 mb-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                  <input
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Price ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Image URL <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Leave blank to use a category stock photo.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Duration in minutes <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 60"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {submitting ? "Listing..." : "List service"}
              </button>
            </form>
          )}

          {loadingData ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-white border border-neutral-200 animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300 rounded-lg">
              <p className="text-neutral-600">You haven&apos;t listed any services yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-neutral-200 bg-white p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- vendor-supplied URLs can be any host; see next.config.ts */}
                    <img
                      src={resolveServiceImage(s.imageUrl, s.category)}
                      alt={s.title}
                      className="h-14 w-14 rounded-md object-cover bg-neutral-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{s.title}</p>
                      <p className="text-sm text-neutral-500">{s.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-neutral-900">
                      ${Number(s.price).toFixed(2)}
                    </span>
                    <select
                      value={s.status}
                      onChange={(e) =>
                        handleStatusChange(s.id, e.target.value as VendorService["status"])
                      }
                      className="text-xs font-medium rounded-md border border-neutral-300 px-2 py-1 bg-white cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "jobs" && (
        <div>
          {loadingData ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-white border border-neutral-200 animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300 rounded-lg">
              <p className="text-neutral-600">No jobs received yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border border-neutral-200 bg-white p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{o.service.title}</p>
                    <p className="text-sm text-neutral-500">
                      {o.buyer.name} · {o.buyer.email}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-neutral-900">
                      ${Number(o.priceAtBooking).toFixed(2)}
                    </span>
                    <select
                      value={o.status}
                      onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                      className="text-xs font-medium rounded-md border border-neutral-300 px-2 py-1 bg-white cursor-pointer"
                    >
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

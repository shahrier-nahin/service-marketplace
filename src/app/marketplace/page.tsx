"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { resolveServiceImage } from "@/lib/images";

interface ServiceListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string | null;
  durationMinutes: number | null;
  vendorBusinessName: string;
}

export default function MarketplacePage() {
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("category", cat);
    const res = await fetch(`/api/services?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setServices(data.services ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const res = await fetch("/api/services", { cache: "no-store" });
      const data = await res.json();
      if (isMounted) {
        setServices(data.services ?? []);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = Array.from(new Set(services.map((s) => s.category))).sort();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query, category);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
        Browse services
      </h1>
      <p className="text-neutral-600 mb-8">
        Search the catalog or filter by category to find the right provider.
      </p>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-10">
        <input
          type="text"
          placeholder="Search services..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-5 py-2 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-lg bg-white border border-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-300 rounded-lg">
          <p className="text-neutral-600">No services match your search yet.</p>
          <p className="text-sm text-neutral-400 mt-1">
            Try a different keyword or clear the category filter.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/marketplace/${service.id}`}
              className="block rounded-lg border border-neutral-200 bg-white overflow-hidden hover:border-neutral-400 hover:shadow-sm transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- vendor-supplied URLs can be any host; see next.config.ts */}
              <img
                src={resolveServiceImage(service.imageUrl, service.category)}
                alt={service.title}
                className="w-full h-40 object-cover bg-neutral-100"
                loading="lazy"
              />
              <div className="p-5">
                <span className="inline-block text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded mb-3">
                  {service.category}
                </span>
                <h3 className="font-semibold text-neutral-900 mb-1 line-clamp-1">
                  {service.title}
                </h3>
                <p className="text-sm text-neutral-600 line-clamp-2 mb-4">
                  {service.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 flex items-center gap-3">
                    <span>by {service.vendorBusinessName}</span>
                    {service.durationMinutes && (
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon />
                        {service.durationMinutes}m
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    ${Number(service.price).toFixed(2)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

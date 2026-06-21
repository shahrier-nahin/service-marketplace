"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { resolveServiceImage } from "@/lib/images";

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string | null;
  durationMinutes: number | null;
  status: string;
  vendorId: string;
  vendorBusinessName: string;
  vendorDescription: string | null;
}

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/services/${id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setService(data.service);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="h-8 w-2/3 bg-neutral-200 rounded animate-pulse mb-4" />
        <div className="h-4 w-1/3 bg-neutral-200 rounded animate-pulse mb-8" />
        <div className="h-32 bg-neutral-200 rounded animate-pulse" />
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
          Service not found
        </h1>
        <p className="text-neutral-600 mb-6">
          This listing may have been removed or is no longer available.
        </p>
        <Link href="/marketplace" className="text-sm font-medium underline underline-offset-2">
          Back to marketplace
        </Link>
      </div>
    );
  }

  function handleBookNow() {
    if (!user) {
      router.push(`/login?redirectTo=/checkout/${id}`);
      return;
    }
    router.push(`/checkout/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link href="/marketplace" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">
        ← Back to marketplace
      </Link>

      {/* eslint-disable-next-line @next/next/no-img-element -- vendor-supplied URLs can be any host; see next.config.ts */}
      <img
        src={resolveServiceImage(service.imageUrl, service.category)}
        alt={service.title}
        className="w-full h-64 sm:h-80 object-cover rounded-lg bg-neutral-100 mb-6"
      />

      <span className="inline-block text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded mb-3">
        {service.category}
      </span>

      <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
        {service.title}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        Offered by <span className="font-medium text-neutral-700">{service.vendorBusinessName}</span>
        {service.durationMinutes && (
          <span> · Estimated duration: {service.durationMinutes} minutes</span>
        )}
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-neutral-900 mb-2">About this service</h2>
        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
          {service.description}
        </p>
      </div>

      {service.vendorDescription && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="font-semibold text-neutral-900 mb-2">
            About {service.vendorBusinessName}
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            {service.vendorDescription}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6 flex items-center justify-between sticky bottom-4 shadow-sm">
        <div>
          <p className="text-xs text-neutral-500">Price</p>
          <p className="text-2xl font-semibold text-neutral-900">
            ${Number(service.price).toFixed(2)}
          </p>
        </div>
        <button
          onClick={handleBookNow}
          className="px-6 py-3 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Book now
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface ServiceDetail {
  id: string;
  title: string;
  category: string;
  price: string;
  vendorBusinessName: string;
}

type Step = "review" | "processing" | "success" | "error";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("review");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirectTo=/checkout/${id}`);
      return;
    }
    fetch(`/api/services/${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setService(data.service ?? null))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  async function handleConfirmBooking() {
    setStep("processing");
    setErrorMsg(null);

    // Simulated sandbox payment delay — mirrors the latency of a real
    // payment-gateway round trip without calling out to any real processor.
    await new Promise((resolve) => setTimeout(resolve, 900));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Could not complete the booking.");
        setStep("error");
        return;
      }

      setOrderId(data.order.id);
      setStep("success");
    } catch {
      setErrorMsg("Could not reach the server. Please try again.");
      setStep("error");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-16">
        <div className="h-6 w-1/2 bg-neutral-200 rounded animate-pulse mb-6" />
        <div className="h-40 bg-neutral-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
          Service not found
        </h1>
        <Link href="/marketplace" className="text-sm font-medium underline underline-offset-2">
          Back to marketplace
        </Link>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-16 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 text-2xl mb-4">
          ✓
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
          Booking confirmed
        </h1>
        <p className="text-neutral-600 mb-1">
          {service.title} with {service.vendorBusinessName}
        </p>
        <p className="text-xs text-neutral-400 mb-8">Order ID: {orderId}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard/user"
            className="px-5 py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            View my orders
          </Link>
          <Link
            href="/marketplace"
            className="px-5 py-2.5 rounded-md border border-neutral-300 text-sm font-medium text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            Keep browsing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
        Confirm your booking
      </h1>
      <p className="text-sm text-neutral-600 mb-8">
        Review the details below, then complete checkout through our sandbox
        payment flow.
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div>
            <p className="font-semibold text-neutral-900">{service.title}</p>
            <p className="text-sm text-neutral-500">{service.vendorBusinessName}</p>
          </div>
          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
            {service.category}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-neutral-600 mb-1">
          <span>Service price</span>
          <span>${Number(service.price).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold text-neutral-900 pt-3 mt-3 border-t border-neutral-100">
          <span>Total</span>
          <span>${Number(service.price).toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 p-4 mb-6 text-xs text-neutral-500">
        This is a sandbox checkout. No real payment method is charged —
        confirming below simulates a successful payment-gateway transaction.
      </div>

      {step === "error" && errorMsg && (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        onClick={handleConfirmBooking}
        disabled={step === "processing"}
        className="w-full py-3 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {step === "processing"
          ? "Processing payment..."
          : `Confirm and pay $${Number(service.price).toFixed(2)}`}
      </button>
    </div>
  );
}

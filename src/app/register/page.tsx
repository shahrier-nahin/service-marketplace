"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Role = "USER" | "VENDOR";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [role, setRole] = useState<Role>("USER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          ...(role === "VENDOR" ? { businessName } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      await refresh();
      router.push(role === "VENDOR" ? "/dashboard/vendor" : "/dashboard/user");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
        Create your account
      </h1>
      <p className="text-sm text-neutral-600 mb-8">
        Already have an account?{" "}
        <Link href="/login" className="text-neutral-900 font-medium underline underline-offset-2">
          Log in
        </Link>
      </p>

      <div className="flex rounded-md border border-neutral-300 p-1 mb-6 bg-white">
        <button
          type="button"
          onClick={() => setRole("USER")}
          className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
            role === "USER"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          I&apos;m booking services
        </button>
        <button
          type="button"
          onClick={() => setRole("VENDOR")}
          className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
            role === "VENDOR"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          I&apos;m a service provider
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {role === "VENDOR" && (
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-neutral-700 mb-1">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              required={role === "VENDOR"}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">At least 8 characters.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}

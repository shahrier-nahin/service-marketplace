"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/dashboard/admin"
      : user?.role === "VENDOR"
        ? "/dashboard/vendor"
        : "/dashboard/user";

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-neutral-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm">
            SM
          </span>
          ServiceMarket
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/marketplace"
            className="px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
          >
            Browse services
          </Link>

          {loading ? (
            <div className="h-9 w-20 rounded-md bg-neutral-100 animate-pulse" />
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className="px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
              >
                Dashboard
              </Link>
              <span className="hidden sm:inline text-sm text-neutral-400 px-2">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-3 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
        You don&apos;t have access to this page
      </h1>
      <p className="text-neutral-600 mb-8">
        This area is restricted to a different account role. If you think
        this is a mistake, try logging in with the correct account.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors inline-block"
      >
        Back to home
      </Link>
    </div>
  );
}

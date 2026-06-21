import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-neutral-500 mb-3">
            For homeowners, businesses, and the people who serve them
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 leading-tight">
            Book trusted local services, from vetted providers near you.
          </h1>
          <p className="mt-5 text-lg text-neutral-600 leading-relaxed">
            ServiceMarket connects you with independent vendors for
            everything from home repairs to professional services — browse,
            compare, and book in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="px-5 py-3 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Browse services
            </Link>
            <Link
              href="/register"
              className="px-5 py-3 rounded-md border border-neutral-300 text-sm font-medium text-neutral-800 hover:bg-neutral-100 transition-colors"
            >
              List your business
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="text-sm font-medium text-neutral-400 mb-2">For customers</div>
            <h3 className="font-semibold text-neutral-900 mb-1">Search and compare</h3>
            <p className="text-sm text-neutral-600">
              Filter the catalog by category and find the right provider for
              the job.
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-400 mb-2">For vendors</div>
            <h3 className="font-semibold text-neutral-900 mb-1">Manage your services</h3>
            <p className="text-sm text-neutral-600">
              List what you offer, set your pricing, and track every job that
              comes in.
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-400 mb-2">For everyone</div>
            <h3 className="font-semibold text-neutral-900 mb-1">Simple checkout</h3>
            <p className="text-sm text-neutral-600">
              Book a service in a few clicks with a secure, sandboxed
              checkout flow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

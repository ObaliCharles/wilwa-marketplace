import Link from "next/link";

export const metadata = { title: "You're offline | Wilwa", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-center">
      <section className="max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">Wilwa</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">You&apos;re offline</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Reconnect to browse current products, prices, and orders. Your account and checkout information are never stored for offline use.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">Try again</Link>
      </section>
    </main>
  );
}

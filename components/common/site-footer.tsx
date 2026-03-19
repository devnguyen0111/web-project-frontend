import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/subscription", label: "Subscription" },
];

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-cyan-200/70 bg-white text-slate-800">
      <div className="page-bleed">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_42%),radial-gradient(circle_at_90%_8%,rgba(254,240,138,0.35),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.95))]" />
        <div className="relative page-shell py-8 sm:py-10">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Web Project
              </p>
              <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                A unified frontend shell for the public site, authenticated areas, and
                dashboard experiences with consistent layout boundaries.
              </p>
            </div>

            <nav aria-label="Footer navigation" className="flex flex-wrap gap-2 md:justify-end">
              {footerLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-cyan-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-cyan-200/70 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Built for an admin, author, and subscriber workflow.</span>
            <span>Full-width shell with constrained content areas.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

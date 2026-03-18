import Link from "next/link";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

const highlights = [
  "Auth and profile workflow connected to backend APIs",
  "Editorial dashboard for authors and moderation team",
  "Public blog pages with filters, comments, and polls",
];

const metrics = [
  { label: "API modules synced", value: "Auth / Users / Blog" },
  { label: "Primary user roles", value: "Author / Staff / Admin" },
  { label: "Focus", value: "Performance + UX consistency" },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid gap-8 bg-gradient-to-br from-cyan-600 via-sky-500 to-amber-300 p-8 text-white md:grid-cols-[1.35fr_1fr] md:p-10">
              <MotionDiv
                className="space-y-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.05, ease: smoothEase }}
              >
                <Badge className="bg-white/20 text-white">shadcn-first rebuild</Badge>
                <h1 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">
                  Frontend rebuilt with unified components and stronger UX.
                </h1>
                <p className="max-w-2xl text-sm text-white/90 md:text-base">
                  The application now uses a consistent component system for forms,
                  cards, action buttons, and layout spacing across public pages and
                  authenticated sections.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/blog"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    Explore blog
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-xl border border-white/70 px-4 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    Open dashboard
                  </Link>
                </div>
              </MotionDiv>

              <MotionDiv
                className="glass-panel space-y-3 p-5 text-slate-900"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.12, ease: smoothEase }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Delivery status
                </p>
                {metrics.map((item, index) => (
                  <MotionDiv
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-white/80 p-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.28,
                      delay: 0.16 + index * 0.06,
                      ease: smoothEase,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                  </MotionDiv>
                ))}
              </MotionDiv>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection
        className="section-shell mt-8 grid gap-4 md:grid-cols-3"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        {highlights.map((item, index) => (
          <MotionDiv
            key={item}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: index * 0.07, ease: smoothEase }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Built with shadcn patterns</CardTitle>
                <CardDescription>{item}</CardDescription>
              </CardHeader>
            </Card>
          </MotionDiv>
        ))}
      </MotionSection>
    </main>
  );
}

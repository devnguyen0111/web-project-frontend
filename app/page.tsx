import Link from "next/link";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const highlights = [
  {
    title: "Public content",
    description:
      "Blog, subscriptions, and product discovery share the same visual language so the public surface feels unified.",
  },
  {
    title: "Transactional flows",
    description:
      "Cart, orders, and wallet pages keep the purchase path narrow, clear, and focused on the next action.",
  },
  {
    title: "Role-aware dashboards",
    description:
      "Authenticated sections retain the same color system while separating public browsing from account management.",
  },
];

const metrics = [
  { label: "Layout pattern", value: "Full-bleed hero + constrained content" },
  { label: "Tone", value: "Cyan / amber / slate" },
  { label: "Focus", value: "Clarity, density control, responsiveness" },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  return (
    <main className="pb-20 pt-0">
      <MotionSection
        className="relative isolate overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-[26rem] w-[26rem] rounded-full bg-amber-300/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cyan-200/40 to-transparent" />
        </div>

        <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
          <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur md:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
            <MotionDiv
              className="space-y-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.05, ease: smoothEase }}
            >
              <Badge className="w-fit bg-white/85 text-slate-800">Hybrid layout rebuild</Badge>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                  A sharper frontend with full-bleed energy and disciplined content width.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                  The public experience now separates banner-level storytelling from the
                  content that users actually read, compare, and act on. Headers and hero
                  sections stay immersive, while lists, cards, and forms remain easy to scan.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/store"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Browse store
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-cyan-200/80 bg-white/85 px-5 text-sm font-semibold text-slate-800 transition hover:bg-cyan-50"
                >
                  Explore blog
                </Link>
                <Link
                  href="/subscription"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 px-5 text-sm font-semibold text-slate-800 transition hover:bg-cyan-50"
                >
                  View plans
                </Link>
              </div>
            </MotionDiv>

            <MotionDiv
              className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/72 p-5"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease: smoothEase }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Design system snapshot
              </p>
              {metrics.map((item, index) => (
                <MotionDiv
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4"
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
        </div>
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
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: index * 0.07, ease: smoothEase }}
          >
            <Card className="h-full border-slate-200/80 bg-white/90 shadow-sm shadow-slate-950/5">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </MotionDiv>
        ))}
      </MotionSection>
    </main>
  );
}


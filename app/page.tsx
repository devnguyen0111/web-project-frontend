import Link from "next/link";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, GlowDivider } from "@/components/ui";

const highlights = [
  {
    title: "Role-aware workspace",
    description: "Author, Staff, and Admin flows are aligned with backend RBAC and token refresh behavior.",
  },
  {
    title: "Wallet and subscription",
    description: "Wallet top-up, PayOS return sync, and subscription lifecycle are preserved end-to-end.",
  },
  {
    title: "Content operations",
    description: "Public blog, editor blocks, moderation queue, and taxonomy tools remain in one shell.",
  },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  return (
    <main className="pb-16 pt-8 md:pt-12">
      <MotionSection
        className="section-shell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase }}
      >
        <Card className="overflow-hidden border border-[color:color-mix(in_oklab,var(--border),transparent_8%)]">
          <CardContent className="p-0">
            <div className="grid gap-8 p-8 md:grid-cols-[1.35fr_1fr] md:p-10">
              <MotionDiv
                className="space-y-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.05, ease: smoothEase }}
              >
                <Badge variant="default" className="w-fit">
                  Cosmic UI DNA
                </Badge>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                  Rebuilt frontend with clean canonical routes and token-driven design.
                </h1>
                <p className="max-w-3xl text-sm text-[color:var(--muted-foreground)] md:text-base">
                  The shell now uses semantic UI primitives, dark-ready design tokens, and canonical URL
                  contracts while preserving backend integrations for auth, blog, wallet, subscription,
                  staff moderation, and admin operations.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/blog">
                    <Button variant="default">Explore blog</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">Open dashboard</Button>
                  </Link>
                </div>
              </MotionDiv>

              <MotionDiv
                className="glass-panel space-y-3 p-5"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.12, ease: smoothEase }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                  Platform modules
                </p>
                <div className="space-y-2">
                  <p className="rounded-[var(--radius-xs)] border border-[color:var(--border)] px-3 py-2 text-sm">
                    Auth / Users / RBAC
                  </p>
                  <p className="rounded-[var(--radius-xs)] border border-[color:var(--border)] px-3 py-2 text-sm">
                    Blog / Moderation / Taxonomy
                  </p>
                  <p className="rounded-[var(--radius-xs)] border border-[color:var(--border)] px-3 py-2 text-sm">
                    Wallet / PayOS / Subscription
                  </p>
                </div>
              </MotionDiv>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection
        className="section-shell mt-10"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <GlowDivider className="mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, index) => (
            <MotionDiv
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.28, delay: index * 0.06, ease: smoothEase }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </MotionDiv>
          ))}
        </div>
      </MotionSection>
    </main>
  );
}

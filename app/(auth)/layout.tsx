import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

const authHighlights = [
  "Track projects, teams, and issue flow from one workspace.",
  "Keep status visible without adding extra UI noise.",
  "Use the same session across the dashboard and future modules.",
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-3 self-start">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur">
            <Zap className="size-5 text-emerald-500" />
          </span>
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold tracking-tight text-foreground">
              Tracker
            </span>
            <span className="block text-xs text-muted-foreground">
              Issue and team coordination
            </span>
          </span>
        </Link>

        <div className="flex flex-1 items-center py-12">
          <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,480px)] lg:items-center">
            <section className="hidden max-w-xl lg:block">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-500/90">
                Team Access
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground">
                Keep delivery, ownership, and status in one place.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Sign in to continue working or create a new account to start
                managing teams, projects, and issue updates from the same
                workspace.
              </p>

              <div className="mt-10 space-y-4">
                {authHighlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="w-full max-w-md justify-self-end lg:max-w-none">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

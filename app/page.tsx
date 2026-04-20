import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";


export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0F14] text-[#E5E7EB]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(16,185,129,0.26),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(34,211,238,0.22),transparent_30%),linear-gradient(155deg,#0B0F14_0%,#111827_48%,#0B0F14_100%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(229,231,235,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(229,231,235,0.18)_1px,transparent_1px)] bg-size-[44px_44px] opacity-[0.08]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10">
        {/* <header className="animate-in fade-in duration-500">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/30 bg-[#111827] shadow-[0_0_12px_rgba(16,185,129,0.28)]">
              <Zap className="size-5 text-emerald-400" />
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold tracking-tight text-[#E5E7EB]">
                Tracker
              </span>
              <span className="block text-xs text-[#9CA3AF]">
                Multi-project issue tracking
              </span>
            </span>
          </Link>
        </header> */}

        <div className="flex flex-1 items-center py-10 lg:py-16">
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-4xl text-center">
              <p className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.28em] text-emerald-300">
                Welcome to Tracker
              </p>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-[#E5E7EB] md:text-6xl">
                The clean workspace for teams that ship continuously.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#9CA3AF] md:text-lg">
                Move from scattered updates to one focused command center for
                issues, projects, and team coordination.
              </p>

              <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-11 w-full rounded-xl border border-emerald-300/50 bg-linear-to-r from-emerald-400 to-cyan-400 px-5 text-[0.94rem] font-semibold text-[#031016] shadow-[0_0_14px_rgba(16,185,129,0.5)] transition-transform duration-200 hover:-translate-y-0.5 hover:from-emerald-300 hover:to-cyan-300 sm:w-auto"
                >
                  <Link href="/login" className="inline-flex items-center gap-2">
                    Go to Login
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 w-full rounded-xl border-[#1F2937] bg-[#111827] px-5 text-[0.94rem] text-[#E5E7EB] hover:border-cyan-400/55 hover:bg-[#1A2434] hover:text-[#E5E7EB] sm:w-auto"
                >
                  <Link href="/signup">Create Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

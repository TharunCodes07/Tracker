import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IssueGridSkeletonProps {
  count?: number;
}

interface IssueTableSkeletonProps {
  rows?: number;
}

interface IssuesModuleSidebarSkeletonProps {
  collapsed?: boolean;
}

export function IssuesHeaderSkeleton() {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/80 px-5 py-4 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-8 w-72 max-w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-[30rem] max-w-full" />
          </div>
        </div>

        <div className="space-y-3 xl:min-w-[24rem] xl:self-end">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-24 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function IssuesToolbarSkeleton() {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Skeleton className="h-10 w-full xl:max-w-md" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-20 rounded-2xl" />
          <Skeleton className="h-9 w-24 rounded-2xl" />
          <Skeleton className="h-9 w-28 rounded-2xl" />
          <Skeleton className="ml-auto h-7 w-28 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export function IssuesModuleSidebarSkeleton({
  collapsed = false,
}: IssuesModuleSidebarSkeletonProps) {
  if (collapsed) {
    return (
      <div className="flex h-full min-h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/80 p-2 shadow-sm">
        <div className="flex items-center justify-center border-b border-border/60 px-1 py-2">
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 overflow-hidden px-1 py-3">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="h-11 w-11 rounded-2xl" />
        </div>
        <div className="flex justify-center pb-1">
          <Skeleton className="h-11 w-11 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/80 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>

      <div className="flex-1 space-y-2 overflow-hidden p-3">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function IssuesGridSkeleton({ count = 6 }: IssueGridSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="relative min-h-[308px] border-border/60 bg-linear-to-br from-card via-card to-emerald-400/[0.03] shadow-[0_20px_40px_-36px_rgba(15,23,42,0.42)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/55 to-cyan-400/55" />
          <CardContent className="flex h-full flex-col p-0">
            <CardHeader className="gap-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </CardHeader>

            <div className="grid gap-3 border-t border-border/60 px-6 pt-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((__, detailIndex) => (
                <div
                  key={detailIndex}
                  className="rounded-2xl border border-border/60 bg-background/55 px-3 py-3"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function IssuesTableSkeleton({ rows = 8 }: IssueTableSkeletonProps) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableHead>
              <TableHead className="w-[12%] text-center">
                <Skeleton className="mx-auto h-4 w-14" />
              </TableHead>
              <TableHead className="w-[14%] text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[12%] text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[12%] text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[12%] text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[12%] text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[10%] text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="whitespace-normal">
                  <div className="mx-auto max-w-[260px] space-y-2 text-center">
                    <Skeleton className="mx-auto h-6 w-16 rounded-full" />
                    <Skeleton className="mx-auto h-4 w-3/5" />
                    <Skeleton className="mx-auto h-4 w-full" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-6 w-24 rounded-full" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-6 w-24 rounded-full" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function IssueWorkspaceLoading({
  viewMode = "table",
  moduleSidebarCollapsed = false,
}: {
  viewMode?: "grid" | "table";
  moduleSidebarCollapsed?: boolean;
}) {
  return (
    <div className="space-y-4">
      <IssuesHeaderSkeleton />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className={collapsedClassName(moduleSidebarCollapsed)}>
          <IssuesModuleSidebarSkeleton collapsed={moduleSidebarCollapsed} />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <IssuesToolbarSkeleton />
          {viewMode === "grid" ? <IssuesGridSkeleton /> : <IssuesTableSkeleton />}
        </div>
      </div>
    </div>
  );
}

function collapsedClassName(collapsed: boolean) {
  return collapsed ? "lg:w-[4.75rem] lg:self-stretch" : "lg:w-[18rem] lg:self-stretch";
}

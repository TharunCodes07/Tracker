import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IssueTableSkeletonProps {
  rows?: number;
}

interface IssuesModuleSidebarSkeletonProps {
  collapsed?: boolean;
}

export function IssuesHeaderSkeleton() {
  return (
    <section className="rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start">
        <div className="min-w-0 space-y-2 2xl:w-72 2xl:shrink-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-44 max-w-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-56 max-w-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Skeleton className="h-9 min-w-48 flex-[1_1_22rem] rounded-2xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 2xl:justify-end">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
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

export function IssuesTableSkeleton({ rows = 8 }: IssueTableSkeletonProps) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/80 p-2 shadow-sm sm:p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm">
        <Skeleton className="h-8 w-80 max-w-full rounded-xl" />
        <Skeleton className="ml-auto h-7 w-24 rounded-lg" />
        <Skeleton className="h-7 w-14 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
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
  moduleSidebarCollapsed = false,
}: {
  moduleSidebarCollapsed?: boolean;
}) {
  return (
    <div className="space-y-3">
      <IssuesHeaderSkeleton />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className="min-w-0 flex-1 space-y-4">
          <IssuesTableSkeleton />
        </div>

        <aside className={collapsedClassName(moduleSidebarCollapsed)}>
          <IssuesModuleSidebarSkeleton collapsed={moduleSidebarCollapsed} />
        </aside>
      </div>
    </div>
  );
}

function collapsedClassName(collapsed: boolean) {
  return collapsed ? "xl:w-[4.75rem] xl:self-stretch" : "xl:w-[18rem] xl:self-stretch";
}

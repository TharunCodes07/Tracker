import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProjectsGridSkeletonProps {
  count?: number;
}

interface ProjectsTableSkeletonProps {
  rows?: number;
}

export function ProjectsGridSkeleton({ count = 6 }: ProjectsGridSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="relative min-h-[232px] border-border/60 bg-linear-to-br from-card via-card to-emerald-400/[0.03] shadow-[0_20px_40px_-36px_rgba(15,23,42,0.42)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/55 to-cyan-400/55" />
          <CardContent className="flex h-full flex-col p-0">
            <CardHeader className="gap-4 pb-3">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              </div>
            </CardHeader>

            <div className="grid gap-4 border-t border-border/60 px-4 pt-4 pb-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2 sm:text-right">
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            </div>

            <CardFooter className="mt-auto justify-end border-border/60 bg-transparent pt-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
            </CardFooter>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProjectsTableSkeleton({ rows = 8 }: ProjectsTableSkeletonProps) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[36%] whitespace-normal text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableHead>
              <TableHead className="w-[20%] whitespace-normal text-center">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableHead>
              <TableHead className="w-[14%] whitespace-normal text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[14%] whitespace-normal text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
              <TableHead className="w-[16%] whitespace-normal text-center">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="whitespace-normal">
                  <div className="mx-auto max-w-[280px] space-y-2 text-center">
                    <Skeleton className="mx-auto h-4 w-3/5" />
                    <Skeleton className="mx-auto h-4 w-full" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal text-center">
                  <div className="mx-auto flex max-w-[180px] items-center justify-center gap-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal text-center">
                  <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell className="whitespace-normal text-center">
                  <div className="mx-auto flex items-center justify-center gap-2">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal text-center">
                  <div className="mx-auto flex items-center justify-center gap-2">
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

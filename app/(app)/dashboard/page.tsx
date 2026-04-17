import { getDashboardOverview } from "@/routes/dashboard/queries";

export default async function DashboardPage() {
  const { metrics, recentUsers } = await getDashboardOverview();

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="border-b p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Data on this page now comes from route-scoped Drizzle query modules.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border-b p-6 last:border-b-0 xl:[&:nth-last-child(-n+3)]:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Recent auth users</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pulled from `routes/auth/queries.ts`.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {recentUsers.length ? (
            recentUsers.map((recentUser) => (
              <div
                key={recentUser.id}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{recentUser.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {recentUser.email}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {recentUser.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No auth users have been created yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { IssueStatusBadge } from "@/components/issues/shared/issue-display";
import { ACTIVE_ISSUE_STATUS_OPTIONS, ISSUE_TYPE_OPTIONS } from "@/routes/issues/types";

export function SettingsView({ projectPrefix }: { projectPrefix: string }) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border/70 bg-background p-4">
        <h3 className="text-sm font-semibold">Workflow statuses</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACTIVE_ISSUE_STATUS_OPTIONS.map((status) => (
            <IssueStatusBadge key={status.value} status={status.value} />
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-border/70 bg-background p-4">
        <h3 className="text-sm font-semibold">Issue key prefix</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          New issues use the project prefix{" "}
          <span className="font-medium text-foreground">{projectPrefix}</span> and a project-wide
          sequence.
        </p>
      </section>
      <section className="rounded-lg border border-border/70 bg-background p-4">
        <h3 className="text-sm font-semibold">Issue types</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {ISSUE_TYPE_OPTIONS.map((type) => (
            <Badge key={type.value} variant="secondary">
              {type.label}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

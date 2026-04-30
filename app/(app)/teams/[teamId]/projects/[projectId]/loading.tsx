import { IssuePageSidebarController } from "@/components/issues/issue-page-sidebar-controller";
import { IssueWorkspaceLoading } from "@/components/issues/issues-view-skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      <IssuePageSidebarController />
      <IssueWorkspaceLoading />
    </div>
  );
}

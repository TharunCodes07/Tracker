import { IssuePageSidebarController } from "@/components/issues/issue-page-sidebar-controller";
import { IssueWorkspaceLoading } from "@/components/issues/issues-view-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <IssuePageSidebarController />
      <IssueWorkspaceLoading viewMode="table" />
    </div>
  );
}

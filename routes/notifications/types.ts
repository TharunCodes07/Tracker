export const NOTIFICATION_TRIGGER_VALUES = [
  "team.invited",
  "team.role_assigned",
  "project.created",
  "issue.created",
  "issue.assigned",
  "issue.assigned_to_role",
  "issue.marked_for_review",
  "issue.ready_for_test",
  "issue.fixed",
  "issue.deployed",
  "issue.reopened",
] as const;

export type NotificationTrigger = (typeof NOTIFICATION_TRIGGER_VALUES)[number];

export interface NotificationListItem {
  id: string;
  trigger: NotificationTrigger;
  title: string;
  message: string;
  href: string;
  teamId: string | null;
  projectId: string | null;
  issueId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsInput {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
}

export interface NotificationsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface NotificationsResponse {
  notifications: NotificationListItem[];
  unreadCount: number;
  pagination: NotificationsPagination;
  unreadOnly: boolean;
}

export interface NotificationMutationResponse {
  notification: NotificationListItem;
  message: string;
}

interface NotificationEventBase {
  actorId: string;
  actorName: string;
  teamId: string;
}

export interface ProjectCreatedNotificationEvent extends NotificationEventBase {
  type: "project.created";
  projectId: string;
  projectName: string;
}

export interface TeamInvitedNotificationEvent extends NotificationEventBase {
  type: "team.invited";
  invitedUserId: string;
  teamName: string;
}

export interface TeamRoleAssignedNotificationEvent extends NotificationEventBase {
  type: "team.role_assigned";
  memberUserId: string;
  teamName: string;
  roles: string[];
}

export interface IssueCreatedNotificationEvent extends NotificationEventBase {
  type: "issue.created";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  assignedTo: string | null;
}

export interface IssueAssignedNotificationEvent extends NotificationEventBase {
  type: "issue.assigned";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  assigneeId: string;
}

export interface IssueAssignedToRoleNotificationEvent extends NotificationEventBase {
  type: "issue.assigned_to_role";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  role: "developer" | "tester";
}

export interface IssueMarkedForReviewNotificationEvent extends NotificationEventBase {
  type: "issue.marked_for_review";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  reviewerId: string | null;
}

export interface IssueReadyForTestNotificationEvent extends NotificationEventBase {
  type: "issue.ready_for_test";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
}

export interface IssueFixedNotificationEvent extends NotificationEventBase {
  type: "issue.fixed";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  testerId: string | null;
}

export interface IssueDeployedNotificationEvent extends NotificationEventBase {
  type: "issue.deployed";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  testerId: string | null;
}

export interface IssueReopenedNotificationEvent extends NotificationEventBase {
  type: "issue.reopened";
  projectId: string;
  issueId: string;
  issueNo: number;
  issueTitle: string;
  assigneeId: string | null;
}

export type NotificationEvent =
  | TeamInvitedNotificationEvent
  | TeamRoleAssignedNotificationEvent
  | ProjectCreatedNotificationEvent
  | IssueCreatedNotificationEvent
  | IssueAssignedNotificationEvent
  | IssueAssignedToRoleNotificationEvent
  | IssueMarkedForReviewNotificationEvent
  | IssueReadyForTestNotificationEvent
  | IssueFixedNotificationEvent
  | IssueDeployedNotificationEvent
  | IssueReopenedNotificationEvent;

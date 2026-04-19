export const NOTIFICATION_TRIGGER_VALUES = [
  "project.created",
  "issue.created",
  "issue.assigned",
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

export interface NotificationsResponse {
  notifications: NotificationListItem[];
  unreadCount: number;
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

export type NotificationEvent =
  | ProjectCreatedNotificationEvent
  | IssueCreatedNotificationEvent
  | IssueAssignedNotificationEvent;

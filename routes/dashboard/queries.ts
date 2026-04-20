import "server-only";

import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  issues,
  notifications,
  projects,
  teamMemberRoles,
  teams,
  teamsToProjects,
  usersToTeams,
} from "@/db/schema";
import { listNotificationsForUser } from "@/routes/notifications/queries";
import type { NotificationListItem } from "@/routes/notifications/types";
import { listTeamsForUser } from "@/routes/teams/queries";
import type { TeamListItem } from "@/routes/teams/types";

export interface DashboardProjectHealthItem {
  id: string;
  name: string;
  teamNames: string;
  totalIssues: number;
  openIssues: number;
  pendingTestIssues: number;
  criticalIssues: number;
}

export interface DashboardOverview {
  totalTeams: number;
  editableTeams: number;
  totalProjects: number;
  totalIssues: number;
  openIssues: number;
  pendingTestIssues: number;
  criticalIssues: number;
  unreadNotifications: number;
  developerRoleCount: number;
  testerRoleCount: number;
  recentNotifications: NotificationListItem[];
  topProjects: DashboardProjectHealthItem[];
  teamHighlights: TeamListItem[];
}

export async function getDashboardOverviewForUser(userId: string): Promise<DashboardOverview> {
  const accessibleProjectIds = db
    .select({
      projectId: teamsToProjects.projectId,
    })
    .from(usersToTeams)
    .innerJoin(teamsToProjects, eq(usersToTeams.teamId, teamsToProjects.teamId))
    .where(eq(usersToTeams.userId, userId))
    .groupBy(teamsToProjects.projectId)
    .as("dashboard_accessible_project_ids");

  const accessibleProjectTeams = db
    .select({
      projectId: teamsToProjects.projectId,
      teamNames:
        sql<string>`string_agg(distinct ${teams.name}, ', ' order by ${teams.name})`.as(
          "teamNames"
        ),
    })
    .from(usersToTeams)
    .innerJoin(teamsToProjects, eq(usersToTeams.teamId, teamsToProjects.teamId))
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .where(eq(usersToTeams.userId, userId))
    .groupBy(teamsToProjects.projectId)
    .as("dashboard_accessible_project_teams");

  const [
    teamSummaryRow,
    projectSummaryRow,
    issueSummaryRow,
    unreadNotificationsRow,
    developerRoleRow,
    testerRoleRow,
    topProjectRows,
    teamHighlightsResponse,
    recentNotificationsResponse,
  ] = await Promise.all([
    db
      .select({
        totalTeams: count(usersToTeams.teamId),
        editableTeams: sql<number>`cast(
          coalesce(
            sum(
              case
                when ${teams.createdBy} = ${userId} or ${usersToTeams.accessLevel} = 'edit' then 1
                else 0
              end
            ),
            0
          ) as integer
        )`,
      })
      .from(usersToTeams)
      .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
      .where(eq(usersToTeams.userId, userId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        totalProjects: count(accessibleProjectIds.projectId),
      })
      .from(accessibleProjectIds)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        totalIssues: count(issues.id),
        openIssues: sql<number>`cast(
          count(${issues.id}) filter (where ${issues.status} <> 'done') as integer
        )`,
        pendingTestIssues: sql<number>`cast(
          count(${issues.id}) filter (where ${issues.status} = 'done' and ${issues.testedBy} is null) as integer
        )`,
        criticalIssues: sql<number>`cast(
          count(${issues.id}) filter (where ${issues.priority} = 'critical') as integer
        )`,
      })
      .from(accessibleProjectIds)
      .innerJoin(issues, eq(accessibleProjectIds.projectId, issues.projectId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        unreadNotifications: count(notifications.id),
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        roleCount: count(teamMemberRoles.teamId),
      })
      .from(teamMemberRoles)
      .where(and(eq(teamMemberRoles.userId, userId), eq(teamMemberRoles.role, "developer")))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        roleCount: count(teamMemberRoles.teamId),
      })
      .from(teamMemberRoles)
      .where(and(eq(teamMemberRoles.userId, userId), eq(teamMemberRoles.role, "tester")))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: projects.id,
        name: projects.name,
        teamNames: sql<string>`coalesce(${accessibleProjectTeams.teamNames}, 'Unassigned')`,
        totalIssues: sql<number>`cast(count(${issues.id}) as integer)`,
        openIssues: sql<number>`cast(
          count(${issues.id}) filter (where ${issues.status} <> 'done') as integer
        )`,
        pendingTestIssues: sql<number>`cast(
          count(${issues.id}) filter (where ${issues.status} = 'done' and ${issues.testedBy} is null) as integer
        )`,
        criticalIssues: sql<number>`cast(
          count(${issues.id}) filter (where ${issues.priority} = 'critical') as integer
        )`,
      })
      .from(accessibleProjectIds)
      .innerJoin(projects, eq(accessibleProjectIds.projectId, projects.id))
      .leftJoin(accessibleProjectTeams, eq(accessibleProjectTeams.projectId, projects.id))
      .leftJoin(issues, eq(projects.id, issues.projectId))
      .groupBy(projects.id, projects.name, accessibleProjectTeams.teamNames)
      .orderBy(
        desc(
          sql`count(${issues.id}) filter (where ${issues.status} <> 'done')`
        ),
        desc(
          sql`count(${issues.id}) filter (where ${issues.status} = 'done' and ${issues.testedBy} is null)`
        ),
        desc(count(issues.id)),
        projects.name
      )
      .limit(6),
    listTeamsForUser(userId, {
      page: 1,
      pageSize: 4,
      search: "",
      sortBy: "memberCount",
      sortDirection: "desc",
    }),
    listNotificationsForUser(userId, {
      page: 1,
      pageSize: 5,
      unreadOnly: false,
    }),
  ]);

  return {
    totalTeams: Number(teamSummaryRow?.totalTeams ?? 0),
    editableTeams: Number(teamSummaryRow?.editableTeams ?? 0),
    totalProjects: Number(projectSummaryRow?.totalProjects ?? 0),
    totalIssues: Number(issueSummaryRow?.totalIssues ?? 0),
    openIssues: Number(issueSummaryRow?.openIssues ?? 0),
    pendingTestIssues: Number(issueSummaryRow?.pendingTestIssues ?? 0),
    criticalIssues: Number(issueSummaryRow?.criticalIssues ?? 0),
    unreadNotifications: Number(unreadNotificationsRow?.unreadNotifications ?? 0),
    developerRoleCount: Number(developerRoleRow?.roleCount ?? 0),
    testerRoleCount: Number(testerRoleRow?.roleCount ?? 0),
    recentNotifications: recentNotificationsResponse.notifications,
    topProjects: topProjectRows.map((row) => ({
      id: row.id,
      name: row.name,
      teamNames: row.teamNames,
      totalIssues: Number(row.totalIssues ?? 0),
      openIssues: Number(row.openIssues ?? 0),
      pendingTestIssues: Number(row.pendingTestIssues ?? 0),
      criticalIssues: Number(row.criticalIssues ?? 0),
    })),
    teamHighlights: teamHighlightsResponse.teams,
  };
}

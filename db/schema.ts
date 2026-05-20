import {
  foreignKey,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const currentOrganizationIdDefault = sql`nullif(current_setting('app.current_organization_id', true), '')::uuid`;

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('organizations_slug_unique').on(table.slug),
    index('organizations_created_by_idx').on(table.createdBy),
  ]
);

export const user = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: varchar('role', { length: 16 }).notNull().default('USER'),
    status: varchar('status', { length: 16 }).notNull().default('ACTIVE'),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_email_unique').on(table.email)]
);

export const organizationMembers = pgTable(
  'organization_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 16 }).notNull().default('USER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index('organization_members_organization_id_idx').on(table.organizationId),
    index('organization_members_user_id_idx').on(table.userId),
    index('organization_members_role_idx').on(table.role),
  ]
);

export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 255 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('session_token_unique').on(table.token),
    index('session_user_id_idx').on(table.userId),
    index('session_expires_at_idx').on(table.expiresAt),
  ]
);

export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('account_provider_account_unique').on(table.providerId, table.accountId),
    index('account_user_id_idx').on(table.userId),
  ]
);

export const verification = pgTable(
  'verification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('verification_identifier_idx').on(table.identifier),
    index('verification_expires_at_idx').on(table.expiresAt),
  ]
);

/**
 * App tables
 */

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .default(currentOrganizationIdDefault)
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  visibility: varchar('visibility', { length: 16 }).notNull().default('private'),
  joinCode: varchar('join_code', { length: 12 }).notNull(),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [
    index('teams_organization_id_idx').on(table.organizationId),
    uniqueIndex('teams_join_code_unique').on(table.joinCode),
    index('teams_created_by_idx').on(table.createdBy),
  ]
);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .default(currentOrganizationIdDefault)
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull().default('PROJ'),
  description: text('description'),
  nextIssueNumber: integer('next_issue_number').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [
    index('projects_organization_id_idx').on(table.organizationId),
    index('projects_key_prefix_idx').on(table.keyPrefix),
  ]
);

export const projectModules = pgTable(
  'project_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_modules_organization_id_idx').on(table.organizationId),
    index('project_modules_project_id_idx').on(table.projectId),
    uniqueIndex('project_modules_project_name_unique').on(table.projectId, table.name),
  ]
);

export const projectComponents = pgTable(
  'project_components',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => projectModules.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    description: text('description'),
    leadId: uuid('lead_id').references(() => user.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_components_organization_id_idx').on(table.organizationId),
    index('project_components_project_id_idx').on(table.projectId),
    index('project_components_module_id_idx').on(table.moduleId),
    index('project_components_lead_id_idx').on(table.leadId),
    uniqueIndex('project_components_module_name_unique').on(table.moduleId, table.name),
  ]
);

export const projectEpics = pgTable(
  'project_epics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 24 }).notNull().default('open'),
    startDate: timestamp('start_date', { withTimezone: true }),
    targetDate: timestamp('target_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_epics_organization_id_idx').on(table.organizationId),
    index('project_epics_project_id_idx').on(table.projectId),
    index('project_epics_project_status_idx').on(table.projectId, table.status),
    uniqueIndex('project_epics_project_title_unique').on(table.projectId, table.title),
  ]
);

export const projectReleases = pgTable(
  'project_releases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 16 }).notNull().default('planned'),
    startDate: timestamp('start_date', { withTimezone: true }),
    targetDate: timestamp('target_date', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_releases_organization_id_idx').on(table.organizationId),
    index('project_releases_project_id_idx').on(table.projectId),
    index('project_releases_status_idx').on(table.status),
    uniqueIndex('project_releases_project_name_unique').on(table.projectId, table.name),
  ]
);

export const sprints = pgTable(
  'sprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    goal: text('goal'),
    status: varchar('status', { length: 16 }).notNull().default('planned'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sprints_organization_id_idx').on(table.organizationId),
    index('sprints_project_id_idx').on(table.projectId),
    index('sprints_status_idx').on(table.status),
    uniqueIndex('sprints_project_name_unique').on(table.projectId, table.name),
  ]
);

export const usersToTeams = pgTable(
  'users_to_teams',
  {
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    accessLevel: varchar('access_level', { length: 16 }).notNull().default('edit'),
    membershipStatus: varchar('membership_status', { length: 16 }).notNull().default('active'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.teamId] }),
    index('users_to_teams_organization_id_idx').on(t.organizationId),
    index('users_to_teams_user_id_idx').on(t.userId),
    index('users_to_teams_user_id_membership_status_idx').on(t.userId, t.membershipStatus),
    index('users_to_teams_team_id_idx').on(t.teamId),
    index('users_to_teams_team_id_membership_status_idx').on(t.teamId, t.membershipStatus),
  ]
);

export const teamMemberRoles = pgTable(
  'team_member_roles',
  {
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    teamId: uuid('team_id').notNull(),
    role: varchar('role', { length: 24 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.teamId, t.role] }),
    foreignKey({
      columns: [t.userId, t.teamId],
      foreignColumns: [usersToTeams.userId, usersToTeams.teamId],
      name: 'team_member_roles_membership_fk',
    }).onDelete('cascade'),
    index('team_member_roles_organization_id_idx').on(t.organizationId),
    index('team_member_roles_user_id_idx').on(t.userId),
    index('team_member_roles_team_id_idx').on(t.teamId),
    index('team_member_roles_role_idx').on(t.role),
  ]
);

export const teamsToProjects = pgTable(
  'teams_to_projects',
  {
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.projectId] }),
    index('teams_to_projects_organization_id_idx').on(t.organizationId),
    index('teams_to_projects_team_id_idx').on(t.teamId),
    index('teams_to_projects_project_id_idx').on(t.projectId),
  ]
);

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    key: varchar('key', { length: 32 }).notNull(),
    issueType: varchar('issue_type', { length: 16 }).notNull().default('task'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 24 }).notNull().default('todo'),
    priority: varchar('priority', { length: 16 }).notNull().default('medium'),
    assigneeId: uuid('assignee_id').references(() => user.id, { onDelete: 'set null' }),
    reporterId: uuid('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    testedById: uuid('tested_by_id').references(() => user.id, { onDelete: 'set null' }),
    epicId: uuid('epic_id').references(() => projectEpics.id, { onDelete: 'set null' }),
    parentIssueId: uuid('parent_issue_id').references((): AnyPgColumn => issues.id, {
      onDelete: 'cascade',
    }),
    moduleId: uuid('module_id').references(() => projectModules.id, {
      onDelete: 'set null',
    }),
    componentId: uuid('component_id').references(() => projectComponents.id, {
      onDelete: 'set null',
    }),
    releaseId: uuid('release_id').references(() => projectReleases.id, {
      onDelete: 'set null',
    }),
    sprintId: uuid('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
    remark: text('remark'),
    fixedDate: timestamp('fixed_date', { withTimezone: true }),
    developmentStatus: varchar('development_status', { length: 24 }).notNull().default('not_started'),
    deploymentStatus: varchar('deployment_status', { length: 24 }).notNull().default('not_deployed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issues_organization_id_idx').on(table.organizationId),
    index('issues_project_id_idx').on(table.projectId),
    uniqueIndex('issues_project_key_unique').on(table.projectId, table.key),
    uniqueIndex('issues_project_sequence_unique').on(table.projectId, table.sequence),
    index('issues_project_status_idx').on(table.projectId, table.status),
    index('issues_project_type_idx').on(table.projectId, table.issueType),
    index('issues_project_priority_idx').on(table.projectId, table.priority),
    index('issues_project_module_idx').on(table.projectId, table.moduleId),
    index('issues_project_component_idx').on(table.projectId, table.componentId),
    index('issues_project_epic_idx').on(table.projectId, table.epicId),
    index('issues_project_release_idx').on(table.projectId, table.releaseId),
    index('issues_project_sprint_idx').on(table.projectId, table.sprintId),
    index('issues_assignee_id_idx').on(table.assigneeId),
    index('issues_reporter_id_idx').on(table.reporterId),
    index('issues_tested_by_id_idx').on(table.testedById),
    index('issues_parent_issue_id_idx').on(table.parentIssueId),
    index('issues_updated_at_idx').on(table.updatedAt),
  ]
);

export const issueComments = pgTable(
  'issue_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => user.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issue_comments_organization_id_idx').on(table.organizationId),
    index('issue_comments_project_id_idx').on(table.projectId),
    index('issue_comments_issue_id_idx').on(table.issueId),
    index('issue_comments_author_id_idx').on(table.authorId),
  ]
);

export const issueActivity = pgTable(
  'issue_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => user.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 64 }).notNull(),
    fromValue: text('from_value'),
    toValue: text('to_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issue_activity_organization_id_idx').on(table.organizationId),
    index('issue_activity_project_id_idx').on(table.projectId),
    index('issue_activity_issue_id_idx').on(table.issueId),
    index('issue_activity_actor_id_idx').on(table.actorId),
  ]
);

export const issueLinks = pgTable(
  'issue_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceIssueId: uuid('source_issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    targetIssueId: uuid('target_issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    linkType: varchar('link_type', { length: 32 }).notNull().default('relates_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issue_links_organization_id_idx').on(table.organizationId),
    index('issue_links_project_id_idx').on(table.projectId),
    index('issue_links_source_issue_id_idx').on(table.sourceIssueId),
    index('issue_links_target_issue_id_idx').on(table.targetIssueId),
    uniqueIndex('issue_links_source_target_type_unique').on(
      table.sourceIssueId,
      table.targetIssueId,
      table.linkType
    ),
  ]
);

export const issueMedia = pgTable(
  'issue_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    mediaType: varchar('media_type', { length: 16 }).notNull(),
    bucket: text('bucket').notNull(),
    objectKey: text('object_key').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issue_media_organization_id_idx').on(table.organizationId),
    index('issue_media_project_id_idx').on(table.projectId),
    index('issue_media_issue_id_idx').on(table.issueId),
    index('issue_media_media_type_idx').on(table.mediaType),
    index('issue_media_created_by_idx').on(table.createdBy),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .default(currentOrganizationIdDefault)
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    issueId: uuid('issue_id').references(() => issues.id, { onDelete: 'set null' }),
    trigger: varchar('trigger', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    href: text('href').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notifications_organization_id_idx').on(table.organizationId),
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_user_id_read_at_idx').on(table.userId, table.readAt),
    index('notifications_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('notifications_team_id_idx').on(table.teamId),
    index('notifications_project_id_idx').on(table.projectId),
    index('notifications_issue_id_idx').on(table.issueId),
  ]
);

import {
  foreignKey,
  boolean,
  index,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';


export const user = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_email_unique').on(table.email)]
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
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  joinCode: varchar('join_code', { length: 12 }).notNull(),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [
    uniqueIndex('teams_join_code_unique').on(table.joinCode),
    index('teams_created_by_idx').on(table.createdBy),
  ]
);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const projectModules = pgTable(
  'project_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    parentModuleId: uuid('parent_module_id').references((): AnyPgColumn => projectModules.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 80 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_modules_project_id_idx').on(table.projectId),
    index('project_modules_parent_module_id_idx').on(table.parentModuleId),
    uniqueIndex('project_modules_project_parent_name_unique').on(
      table.projectId,
      table.parentModuleId,
      table.name
    ),
  ]
);

export const issueClasses = pgTable(
  'issue_classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issue_classes_project_id_idx').on(table.projectId),
    uniqueIndex('issue_classes_project_name_unique').on(table.projectId, table.name),
  ]
);

export const usersToTeams = pgTable(
  'users_to_teams',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    accessLevel: varchar('access_level', { length: 16 }).notNull().default('edit'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.teamId] }),
    index('users_to_teams_user_id_idx').on(t.userId),
    index('users_to_teams_team_id_idx').on(t.teamId),
  ]
);

export const teamMemberRoles = pgTable(
  'team_member_roles',
  {
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
    index('team_member_roles_user_id_idx').on(t.userId),
    index('team_member_roles_team_id_idx').on(t.teamId),
    index('team_member_roles_role_idx').on(t.role),
  ]
);

export const teamsToProjects = pgTable(
  'teams_to_projects',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.projectId] }),
    index('teams_to_projects_team_id_idx').on(t.teamId),
    index('teams_to_projects_project_id_idx').on(t.projectId),
  ]
);

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id').references(() => projectModules.id, { onDelete: 'set null' }),
    issueClassId: uuid('issue_class_id').references(() => issueClasses.id, {
      onDelete: 'set null',
    }),
    no: serial('no'),
    navigation: varchar('navigation', { length: 255 }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    priority: varchar('priority', { length: 50 }).notNull(), // Low, Medium, High, Critical
    status: varchar('status', { length: 50 }).notNull(), // Open, In Progress, Resolved, Closed
    assignedTo: uuid('assigned_to').references(() => user.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    comments: text('comments'),
    remark: text('remark'),
    testedBy: uuid('tested_by').references(() => user.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
    fixedDate: timestamp('fixed_date', { withTimezone: true }),
    development: boolean('development').notNull().default(false),
    deployment: boolean('deployment').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('issues_project_id_idx').on(table.projectId),
    index('issues_module_id_idx').on(table.moduleId),
    index('issues_issue_class_id_idx').on(table.issueClassId),
    index('issues_assigned_to_idx').on(table.assignedTo),
    index('issues_reviewed_by_idx').on(table.reviewedBy),
    index('issues_tested_by_idx').on(table.testedBy),
    index('issues_created_by_idx').on(table.createdBy),
    index('issues_status_idx').on(table.status),
    index('issues_priority_idx').on(table.priority),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_user_id_read_at_idx').on(table.userId, table.readAt),
    index('notifications_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('notifications_team_id_idx').on(table.teamId),
    index('notifications_project_id_idx').on(table.projectId),
    index('notifications_issue_id_idx').on(table.issueId),
  ]
);

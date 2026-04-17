import { pgTable, uuid, varchar, text, timestamp, serial, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
});

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
});

export const usersToTeams = pgTable('users_to_teams', {
  userId: uuid('user_id').notNull().references(() => users.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
}, (t) => [
  primaryKey({ columns: [t.userId, t.teamId] }),
]);

export const teamsToProjects = pgTable('teams_to_projects', {
  teamId: uuid('team_id').notNull().references(() => teams.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
}, (t) => [
  primaryKey({ columns: [t.teamId, t.projectId] }),
]);

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  no: serial('no'),
  navigation: varchar('navigation', { length: 255 }),
  title: varchar('title', { length: 255 }).notNull(),
  priority: varchar('priority', { length: 50 }).notNull(), // e.g. Low, Medium, High, Critical
  status: varchar('status', { length: 50 }).notNull(), // e.g. Open, In Progress, Resolved, Closed
  assignedTo: uuid('assigned_to').references(() => users.id),
  comments: text('comments'),
  remark: text('remark'),
  testedBy: uuid('tested_by').references(() => users.id),
  fixedDate: timestamp('fixed_date'),
  development: text('development'),
  deployment: text('deployment'),
});

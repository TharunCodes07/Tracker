ALTER TABLE "issue_media" DROP CONSTRAINT IF EXISTS "issue_media_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_issue_id_issues_id_fk";
--> statement-breakpoint
UPDATE "notifications" SET "issue_id" = NULL;
--> statement-breakpoint
TRUNCATE TABLE "issue_media";
--> statement-breakpoint
DROP TABLE IF EXISTS "issue_links" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "issue_activity" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "issue_comments" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "issues" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sprints" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "project_releases" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "project_components" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "project_epics" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "project_modules" CASCADE;
--> statement-breakpoint
CREATE TABLE "project_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_components" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "module_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "description" text,
  "lead_id" uuid,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_epics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(24) DEFAULT 'open' NOT NULL,
  "start_date" timestamp with time zone,
  "target_date" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "description" text,
  "status" varchar(16) DEFAULT 'planned' NOT NULL,
  "start_date" timestamp with time zone,
  "target_date" timestamp with time zone,
  "released_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "goal" text,
  "status" varchar(16) DEFAULT 'planned' NOT NULL,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "key" varchar(32) NOT NULL,
  "issue_type" varchar(16) DEFAULT 'task' NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(24) DEFAULT 'open' NOT NULL,
  "priority" varchar(16) DEFAULT 'medium' NOT NULL,
  "module_id" uuid,
  "component_id" uuid,
  "epic_id" uuid,
  "sprint_id" uuid,
  "release_id" uuid,
  "assignee_id" uuid,
  "reporter_id" uuid,
  "tested_by_id" uuid,
  "parent_issue_id" uuid,
  "remark" text,
  "fixed_date" timestamp with time zone,
  "development_status" varchar(24) DEFAULT 'not_started' NOT NULL,
  "deployment_status" varchar(24) DEFAULT 'not_deployed' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "author_id" uuid,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "actor_id" uuid,
  "action" varchar(64) NOT NULL,
  "from_value" text,
  "to_value" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
  "project_id" uuid NOT NULL,
  "source_issue_id" uuid NOT NULL,
  "target_issue_id" uuid NOT NULL,
  "link_type" varchar(32) DEFAULT 'relates_to' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_lead_id_user_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_epics" ADD CONSTRAINT "project_epics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_epics" ADD CONSTRAINT "project_epics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_releases" ADD CONSTRAINT "project_releases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_releases" ADD CONSTRAINT "project_releases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_component_id_project_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."project_components"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_epic_id_project_epics_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."project_epics"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_release_id_project_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."project_releases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_tested_by_id_user_id_fk" FOREIGN KEY ("tested_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_issue_id_issues_id_fk" FOREIGN KEY ("parent_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_target_issue_id_issues_id_fk" FOREIGN KEY ("target_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "project_modules_organization_id_idx" ON "project_modules" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "project_modules_project_id_idx" ON "project_modules" USING btree ("project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_modules_project_name_unique" ON "project_modules" USING btree ("project_id","name");
--> statement-breakpoint
CREATE INDEX "project_components_organization_id_idx" ON "project_components" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "project_components_project_id_idx" ON "project_components" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_components_module_id_idx" ON "project_components" USING btree ("module_id");
--> statement-breakpoint
CREATE INDEX "project_components_lead_id_idx" ON "project_components" USING btree ("lead_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_components_module_name_unique" ON "project_components" USING btree ("module_id","name");
--> statement-breakpoint
CREATE INDEX "project_epics_organization_id_idx" ON "project_epics" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "project_epics_project_id_idx" ON "project_epics" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_epics_project_status_idx" ON "project_epics" USING btree ("project_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_epics_project_title_unique" ON "project_epics" USING btree ("project_id","title");
--> statement-breakpoint
CREATE INDEX "project_releases_organization_id_idx" ON "project_releases" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "project_releases_project_id_idx" ON "project_releases" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "project_releases_status_idx" ON "project_releases" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_releases_project_name_unique" ON "project_releases" USING btree ("project_id","name");
--> statement-breakpoint
CREATE INDEX "sprints_organization_id_idx" ON "sprints" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "sprints_project_id_idx" ON "sprints" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "sprints_status_idx" ON "sprints" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "sprints_project_name_unique" ON "sprints" USING btree ("project_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_key_unique" ON "issues" USING btree ("project_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_sequence_unique" ON "issues" USING btree ("project_id","sequence");
--> statement-breakpoint
CREATE INDEX "issues_project_status_idx" ON "issues" USING btree ("project_id","status");
--> statement-breakpoint
CREATE INDEX "issues_project_type_idx" ON "issues" USING btree ("project_id","issue_type");
--> statement-breakpoint
CREATE INDEX "issues_project_priority_idx" ON "issues" USING btree ("project_id","priority");
--> statement-breakpoint
CREATE INDEX "issues_project_module_idx" ON "issues" USING btree ("project_id","module_id");
--> statement-breakpoint
CREATE INDEX "issues_project_component_idx" ON "issues" USING btree ("project_id","component_id");
--> statement-breakpoint
CREATE INDEX "issues_project_epic_idx" ON "issues" USING btree ("project_id","epic_id");
--> statement-breakpoint
CREATE INDEX "issues_project_release_idx" ON "issues" USING btree ("project_id","release_id");
--> statement-breakpoint
CREATE INDEX "issues_project_sprint_idx" ON "issues" USING btree ("project_id","sprint_id");
--> statement-breakpoint
CREATE INDEX "issues_assignee_id_idx" ON "issues" USING btree ("assignee_id");
--> statement-breakpoint
CREATE INDEX "issues_reporter_id_idx" ON "issues" USING btree ("reporter_id");
--> statement-breakpoint
CREATE INDEX "issues_tested_by_id_idx" ON "issues" USING btree ("tested_by_id");
--> statement-breakpoint
CREATE INDEX "issues_parent_issue_id_idx" ON "issues" USING btree ("parent_issue_id");
--> statement-breakpoint
CREATE INDEX "issues_updated_at_idx" ON "issues" USING btree ("updated_at");

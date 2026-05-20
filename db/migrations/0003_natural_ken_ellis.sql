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
CREATE TABLE "project_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"project_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"lead_id" uuid,
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
	"release_date" timestamp with time zone,
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
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_classes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_modules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "issue_classes" CASCADE;--> statement-breakpoint
DROP TABLE "project_modules" CASCADE;--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_module_id_project_modules_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_issue_class_id_issue_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_assigned_to_user_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_reviewed_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_tested_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_reopened_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_created_by_user_id_fk";
--> statement-breakpoint
DROP INDEX "issues_module_id_idx";--> statement-breakpoint
DROP INDEX "issues_issue_class_id_idx";--> statement-breakpoint
DROP INDEX "issues_assigned_to_idx";--> statement-breakpoint
DROP INDEX "issues_reviewed_by_idx";--> statement-breakpoint
DROP INDEX "issues_tested_by_idx";--> statement-breakpoint
DROP INDEX "issues_reopened_by_idx";--> statement-breakpoint
DROP INDEX "issues_reopened_at_idx";--> statement-breakpoint
DROP INDEX "issues_created_by_idx";--> statement-breakpoint
DROP INDEX "issues_status_idx";--> statement-breakpoint
DROP INDEX "issues_priority_idx";--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "priority" SET DATA TYPE varchar(16);--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "priority" SET DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DATA TYPE varchar(24);--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'todo';--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "sequence" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "key" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "issue_type" varchar(16) DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reporter_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "epic_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "parent_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "component_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "release_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "sprint_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "key_prefix" varchar(12) DEFAULT 'PROJ' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "next_issue_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity" ADD CONSTRAINT "issue_activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_target_issue_id_issues_id_fk" FOREIGN KEY ("target_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_lead_id_user_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_releases" ADD CONSTRAINT "project_releases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_releases" ADD CONSTRAINT "project_releases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_activity_organization_id_idx" ON "issue_activity" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_activity_project_id_idx" ON "issue_activity" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_activity_issue_id_idx" ON "issue_activity" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_activity_actor_id_idx" ON "issue_activity" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "issue_comments_organization_id_idx" ON "issue_comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_comments_project_id_idx" ON "issue_comments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_comments_issue_id_idx" ON "issue_comments" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_comments_author_id_idx" ON "issue_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "issue_links_organization_id_idx" ON "issue_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_links_project_id_idx" ON "issue_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_links_source_issue_id_idx" ON "issue_links" USING btree ("source_issue_id");--> statement-breakpoint
CREATE INDEX "issue_links_target_issue_id_idx" ON "issue_links" USING btree ("target_issue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_links_source_target_type_unique" ON "issue_links" USING btree ("source_issue_id","target_issue_id","link_type");--> statement-breakpoint
CREATE INDEX "project_components_organization_id_idx" ON "project_components" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_components_project_id_idx" ON "project_components" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_components_lead_id_idx" ON "project_components" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_components_project_name_unique" ON "project_components" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "project_releases_organization_id_idx" ON "project_releases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_releases_project_id_idx" ON "project_releases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_releases_status_idx" ON "project_releases" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_releases_project_name_unique" ON "project_releases" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "sprints_organization_id_idx" ON "sprints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sprints_project_id_idx" ON "sprints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sprints_status_idx" ON "sprints" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sprints_project_name_unique" ON "sprints" USING btree ("project_id","name");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_epic_id_issues_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_issue_id_issues_id_fk" FOREIGN KEY ("parent_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_component_id_project_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."project_components"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_release_id_project_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."project_releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_key_unique" ON "issues" USING btree ("project_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_sequence_unique" ON "issues" USING btree ("project_id","sequence");--> statement-breakpoint
CREATE INDEX "issues_project_status_idx" ON "issues" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "issues_project_type_idx" ON "issues" USING btree ("project_id","issue_type");--> statement-breakpoint
CREATE INDEX "issues_project_priority_idx" ON "issues" USING btree ("project_id","priority");--> statement-breakpoint
CREATE INDEX "issues_project_component_idx" ON "issues" USING btree ("project_id","component_id");--> statement-breakpoint
CREATE INDEX "issues_project_epic_idx" ON "issues" USING btree ("project_id","epic_id");--> statement-breakpoint
CREATE INDEX "issues_project_release_idx" ON "issues" USING btree ("project_id","release_id");--> statement-breakpoint
CREATE INDEX "issues_project_sprint_idx" ON "issues" USING btree ("project_id","sprint_id");--> statement-breakpoint
CREATE INDEX "issues_assignee_id_idx" ON "issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issues_reporter_id_idx" ON "issues" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "issues_parent_issue_id_idx" ON "issues" USING btree ("parent_issue_id");--> statement-breakpoint
CREATE INDEX "issues_updated_at_idx" ON "issues" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "projects_key_prefix_idx" ON "projects" USING btree ("key_prefix");--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "module_id";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "issue_class_id";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "no";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "navigation";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "assigned_to";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "reviewed_by";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "comments";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "remark";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "tested_by";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "reopened_by";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "reopened_at";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "fixed_date";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "development";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "deployment";
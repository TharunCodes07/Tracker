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
ALTER TABLE "issues" DROP CONSTRAINT "issues_epic_id_issues_id_fk";
--> statement-breakpoint
DROP INDEX "project_components_project_name_unique";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "tested_by_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "module_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "remark" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "fixed_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "development_status" varchar(24) DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "deployment_status" varchar(24) DEFAULT 'not_deployed' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_components" ADD COLUMN "module_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "project_components" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_releases" ADD COLUMN "target_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_releases" ADD COLUMN "released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_epics" ADD CONSTRAINT "project_epics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_epics" ADD CONSTRAINT "project_epics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_epics_organization_id_idx" ON "project_epics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_epics_project_id_idx" ON "project_epics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_epics_project_status_idx" ON "project_epics" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_epics_project_title_unique" ON "project_epics" USING btree ("project_id","title");--> statement-breakpoint
CREATE INDEX "project_modules_organization_id_idx" ON "project_modules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_modules_project_id_idx" ON "project_modules" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_modules_project_name_unique" ON "project_modules" USING btree ("project_id","name");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_tested_by_id_user_id_fk" FOREIGN KEY ("tested_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_epic_id_project_epics_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."project_epics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_project_module_idx" ON "issues" USING btree ("project_id","module_id");--> statement-breakpoint
CREATE INDEX "issues_tested_by_id_idx" ON "issues" USING btree ("tested_by_id");--> statement-breakpoint
CREATE INDEX "project_components_module_id_idx" ON "project_components" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_components_module_name_unique" ON "project_components" USING btree ("module_id","name");--> statement-breakpoint
ALTER TABLE "project_releases" DROP COLUMN "release_date";--> statement-breakpoint
ALTER TABLE "sprints" DROP COLUMN "starts_at";--> statement-breakpoint
ALTER TABLE "sprints" DROP COLUMN "ends_at";
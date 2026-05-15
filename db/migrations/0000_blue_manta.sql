CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"project_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"project_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"media_type" varchar(16) NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"project_id" uuid NOT NULL,
	"module_id" uuid,
	"issue_class_id" uuid,
	"no" serial NOT NULL,
	"navigation" varchar(255),
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"assigned_to" uuid,
	"reviewed_by" uuid,
	"comments" text,
	"remark" text,
	"tested_by" uuid,
	"reopened_by" uuid,
	"reopened_at" timestamp with time zone,
	"created_by" uuid,
	"fixed_date" timestamp with time zone,
	"development" boolean DEFAULT false NOT NULL,
	"deployment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"project_id" uuid,
	"issue_id" uuid,
	"trigger" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"href" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(16) DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"project_id" uuid NOT NULL,
	"parent_module_id" uuid,
	"name" varchar(80) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(255),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member_roles" (
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	CONSTRAINT "team_member_roles_user_id_team_id_role_pk" PRIMARY KEY("user_id","team_id","role")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"visibility" varchar(16) DEFAULT 'private' NOT NULL,
	"join_code" varchar(12) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams_to_projects" (
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	CONSTRAINT "teams_to_projects_team_id_project_id_pk" PRIMARY KEY("team_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" varchar(16) DEFAULT 'USER' NOT NULL,
	"status" varchar(16) DEFAULT 'ACTIVE' NOT NULL,
	"organization_id" uuid,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_to_teams" (
	"organization_id" uuid DEFAULT nullif(current_setting('app.current_organization_id', true), '')::uuid,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"access_level" varchar(16) DEFAULT 'edit' NOT NULL,
	"membership_status" varchar(16) DEFAULT 'active' NOT NULL,
	CONSTRAINT "users_to_teams_user_id_team_id_pk" PRIMARY KEY("user_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_classes" ADD CONSTRAINT "issue_classes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_classes" ADD CONSTRAINT "issue_classes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_issue_class_id_issue_classes_id_fk" FOREIGN KEY ("issue_class_id") REFERENCES "public"."issue_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_tested_by_user_id_fk" FOREIGN KEY ("tested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reopened_by_user_id_fk" FOREIGN KEY ("reopened_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_parent_module_id_project_modules_id_fk" FOREIGN KEY ("parent_module_id") REFERENCES "public"."project_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_roles" ADD CONSTRAINT "team_member_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_roles" ADD CONSTRAINT "team_member_roles_membership_fk" FOREIGN KEY ("user_id","team_id") REFERENCES "public"."users_to_teams"("user_id","team_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams_to_projects" ADD CONSTRAINT "teams_to_projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams_to_projects" ADD CONSTRAINT "teams_to_projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams_to_projects" ADD CONSTRAINT "teams_to_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_teams" ADD CONSTRAINT "users_to_teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_teams" ADD CONSTRAINT "users_to_teams_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_teams" ADD CONSTRAINT "users_to_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "issue_classes_organization_id_idx" ON "issue_classes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_classes_project_id_idx" ON "issue_classes" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_classes_project_name_unique" ON "issue_classes" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "issue_media_organization_id_idx" ON "issue_media" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_media_project_id_idx" ON "issue_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_media_issue_id_idx" ON "issue_media" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_media_media_type_idx" ON "issue_media" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "issue_media_created_by_idx" ON "issue_media" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "issues_organization_id_idx" ON "issues" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issues_project_id_idx" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issues_module_id_idx" ON "issues" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "issues_issue_class_id_idx" ON "issues" USING btree ("issue_class_id");--> statement-breakpoint
CREATE INDEX "issues_assigned_to_idx" ON "issues" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "issues_reviewed_by_idx" ON "issues" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "issues_tested_by_idx" ON "issues" USING btree ("tested_by");--> statement-breakpoint
CREATE INDEX "issues_reopened_by_idx" ON "issues" USING btree ("reopened_by");--> statement-breakpoint
CREATE INDEX "issues_reopened_at_idx" ON "issues" USING btree ("reopened_at");--> statement-breakpoint
CREATE INDEX "issues_created_by_idx" ON "issues" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issues_priority_idx" ON "issues" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "notifications_organization_id_idx" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_team_id_idx" ON "notifications" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "notifications_project_id_idx" ON "notifications" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "notifications_issue_id_idx" ON "notifications" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_members_role_idx" ON "organization_members" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_created_by_idx" ON "organizations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "project_modules_organization_id_idx" ON "project_modules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_modules_project_id_idx" ON "project_modules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_modules_parent_module_id_idx" ON "project_modules" USING btree ("parent_module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_modules_project_parent_name_unique" ON "project_modules" USING btree ("project_id","parent_module_id","name");--> statement-breakpoint
CREATE INDEX "projects_organization_id_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "team_member_roles_organization_id_idx" ON "team_member_roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "team_member_roles_user_id_idx" ON "team_member_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_member_roles_team_id_idx" ON "team_member_roles" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_member_roles_role_idx" ON "team_member_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "teams_organization_id_idx" ON "teams" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_join_code_unique" ON "teams" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX "teams_created_by_idx" ON "teams" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "teams_to_projects_organization_id_idx" ON "teams_to_projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "teams_to_projects_team_id_idx" ON "teams_to_projects" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teams_to_projects_project_id_idx" ON "teams_to_projects" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_to_teams_organization_id_idx" ON "users_to_teams" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_to_teams_user_id_idx" ON "users_to_teams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_to_teams_user_id_membership_status_idx" ON "users_to_teams" USING btree ("user_id","membership_status");--> statement-breakpoint
CREATE INDEX "users_to_teams_team_id_idx" ON "users_to_teams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "users_to_teams_team_id_membership_status_idx" ON "users_to_teams" USING btree ("team_id","membership_status");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");
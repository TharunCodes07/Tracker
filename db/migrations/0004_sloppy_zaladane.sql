ALTER TABLE "issues" DROP CONSTRAINT "issues_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_assigned_to_user_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_tested_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "teams_to_projects" DROP CONSTRAINT "teams_to_projects_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "fixed_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "join_code" varchar(12);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "teams"
SET "join_code" = upper(substr(replace("id"::text, '-', ''), 1, 8))
WHERE "join_code" IS NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "join_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_tested_by_user_id_fk" FOREIGN KEY ("tested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams_to_projects" ADD CONSTRAINT "teams_to_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_project_id_idx" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issues_assigned_to_idx" ON "issues" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "issues_tested_by_idx" ON "issues" USING btree ("tested_by");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issues_priority_idx" ON "issues" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_join_code_unique" ON "teams" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX "teams_created_by_idx" ON "teams" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "teams_to_projects_team_id_idx" ON "teams_to_projects" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teams_to_projects_project_id_idx" ON "teams_to_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "users_to_teams_user_id_idx" ON "users_to_teams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_to_teams_team_id_idx" ON "users_to_teams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");

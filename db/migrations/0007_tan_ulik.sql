ALTER TABLE "issues" ADD COLUMN "tester_assignee_group" varchar(24);--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "tester_assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reopened_by" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reopened_at" timestamp with time zone;--> statement-breakpoint
UPDATE "issues" SET "status" = 'todo' WHERE "status" = 'open';--> statement-breakpoint
UPDATE "issues" SET "reopened_at" = COALESCE("reopened_at", "updated_at"), "status" = 'in_progress' WHERE "status" = 'reopened';--> statement-breakpoint
UPDATE "issues" SET "status" = 'fixed' WHERE "status" = 'done';--> statement-breakpoint
UPDATE "issues" SET "development_status" = 'fixed' WHERE "development_status" = 'done';--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_tester_assignee_id_user_id_fk" FOREIGN KEY ("tester_assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reopened_by_user_id_fk" FOREIGN KEY ("reopened_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_tester_assignee_group_idx" ON "issues" USING btree ("tester_assignee_group");--> statement-breakpoint
CREATE INDEX "issues_tester_assignee_id_idx" ON "issues" USING btree ("tester_assignee_id");--> statement-breakpoint
CREATE INDEX "issues_reopened_by_idx" ON "issues" USING btree ("reopened_by");--> statement-breakpoint
CREATE INDEX "issues_reopened_at_idx" ON "issues" USING btree ("reopened_at");

ALTER TABLE "issues" ALTER COLUMN "issue_type" SET DEFAULT 'bug';--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "assignee_group" varchar(24);--> statement-breakpoint
CREATE INDEX "issues_assignee_group_idx" ON "issues" USING btree ("assignee_group");

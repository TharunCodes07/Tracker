ALTER TABLE "issues" ADD COLUMN "reopened_by" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reopened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reopened_by_user_id_fk" FOREIGN KEY ("reopened_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_reopened_by_idx" ON "issues" USING btree ("reopened_by");--> statement-breakpoint
CREATE INDEX "issues_reopened_at_idx" ON "issues" USING btree ("reopened_at");
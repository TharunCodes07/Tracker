ALTER TABLE "teams" ADD COLUMN "visibility" varchar(16) DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "users_to_teams" ADD COLUMN "membership_status" varchar(16) DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "users_to_teams"
SET "access_level" = 'owner'
FROM "teams"
WHERE "teams"."id" = "users_to_teams"."team_id"
  AND "teams"."created_by" = "users_to_teams"."user_id";--> statement-breakpoint
CREATE INDEX "users_to_teams_user_id_membership_status_idx" ON "users_to_teams" USING btree ("user_id","membership_status");--> statement-breakpoint
CREATE INDEX "users_to_teams_team_id_membership_status_idx" ON "users_to_teams" USING btree ("team_id","membership_status");

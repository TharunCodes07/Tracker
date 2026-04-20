ALTER TABLE "issues"
ALTER COLUMN "development" DROP DEFAULT,
ALTER COLUMN "development" TYPE boolean
USING CASE
  WHEN "development" IS NULL THEN false
  WHEN lower(trim("development")) IN ('true', 't', 'yes', 'y', '1', 'done', 'checked') THEN true
  ELSE false
END;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "development" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "development" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issues"
ALTER COLUMN "deployment" DROP DEFAULT,
ALTER COLUMN "deployment" TYPE boolean
USING CASE
  WHEN "deployment" IS NULL THEN false
  WHEN lower(trim("deployment")) IN ('true', 't', 'yes', 'y', '1', 'done', 'checked') THEN true
  ELSE false
END;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "deployment" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "deployment" SET NOT NULL;

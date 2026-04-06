ALTER TABLE "catalogs" ALTER COLUMN "slug" SET DATA TYPE varchar(300);--> statement-breakpoint
ALTER TABLE "catalogs" ALTER COLUMN "slug" DROP DEFAULT;
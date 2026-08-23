-- Generated with `pnpm db:generate`, then committed as-is.
--
-- `create schema if not exists` matters: the kernel creates `mod_template` before running these, so
-- the bare form fails on boot.
CREATE SCHEMA IF NOT EXISTS "mod_template";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mod_template"."notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_ws_idx" ON "mod_template"."notes" ("workspace_id","created_at");

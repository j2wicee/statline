CREATE TABLE "odds_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prop_id" uuid NOT NULL,
	"bookmaker" text NOT NULL,
	"line_value" numeric(6, 1) NOT NULL,
	"over_odds" smallint NOT NULL,
	"under_odds" smallint NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prop_id" uuid NOT NULL,
	"selection" text NOT NULL,
	"line_at_pick" numeric(6, 1) NOT NULL,
	"confidence" smallint NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "picks_selection_check" CHECK ("picks"."selection" IN ('over', 'under')),
	CONSTRAINT "picks_confidence_check" CHECK ("picks"."confidence" BETWEEN 1 AND 5),
	CONSTRAINT "picks_outcome_check" CHECK ("picks"."outcome" IN ('hit', 'miss', 'pending'))
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"team" text NOT NULL,
	"position" text NOT NULL,
	"sport_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "props" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"sport_id" uuid NOT NULL,
	"stat_category_id" uuid NOT NULL,
	"line_value" numeric(6, 1) NOT NULL,
	"game_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stat_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sport_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stat_categories_sport_id_slug_unique" UNIQUE("sport_id","slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "odds_lines" ADD CONSTRAINT "odds_lines_prop_id_props_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."props"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_prop_id_props_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."props"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_stat_category_id_stat_categories_id_fk" FOREIGN KEY ("stat_category_id") REFERENCES "public"."stat_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_categories" ADD CONSTRAINT "stat_categories_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "odds_lines_prop_id_recorded_at_idx" ON "odds_lines" USING btree ("prop_id","recorded_at");--> statement-breakpoint
CREATE INDEX "odds_lines_prop_id_bookmaker_recorded_at_idx" ON "odds_lines" USING btree ("prop_id","bookmaker","recorded_at");--> statement-breakpoint
CREATE INDEX "picks_user_id_idx" ON "picks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "picks_prop_id_idx" ON "picks" USING btree ("prop_id");--> statement-breakpoint
CREATE INDEX "picks_pending_outcome_idx" ON "picks" USING btree ("outcome") WHERE "picks"."outcome" = 'pending';--> statement-breakpoint
CREATE INDEX "players_sport_id_idx" ON "players" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "props_player_id_idx" ON "props" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "props_sport_id_idx" ON "props" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "props_stat_category_id_idx" ON "props" USING btree ("stat_category_id");--> statement-breakpoint
CREATE INDEX "props_game_date_idx" ON "props" USING btree ("game_date");--> statement-breakpoint
CREATE INDEX "stat_categories_sport_id_idx" ON "stat_categories" USING btree ("sport_id");
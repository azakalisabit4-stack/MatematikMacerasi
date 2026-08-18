CREATE TABLE `achievements` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon_key` text NOT NULL,
	`category` text NOT NULL,
	`tier` text DEFAULT 'bronze' NOT NULL,
	`target` integer DEFAULT 1 NOT NULL,
	`reward_xp` integer DEFAULT 0 NOT NULL,
	`reward_coins` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`target_user_id` text,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_actions_idx` ON `admin_actions` (`admin_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_uq` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `banned_words` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`normalized` text NOT NULL,
	`created_by_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `banned_words_uq` ON `banned_words` (`normalized`);--> statement-breakpoint
CREATE TABLE `daily_tasks` (
	`key` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`metric` text NOT NULL,
	`target` integer NOT NULL,
	`reward_xp` integer DEFAULT 0 NOT NULL,
	`reward_points` integer DEFAULT 0 NOT NULL,
	`reward_coins` integer DEFAULT 0 NOT NULL,
	`icon_key` text DEFAULT 'target' NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `duel_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`duel_id` text NOT NULL,
	`user_id` text NOT NULL,
	`question_index` integer NOT NULL,
	`answer_index` integer NOT NULL,
	`is_correct` integer NOT NULL,
	`ms_taken` integer NOT NULL,
	`server_ts` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`duel_id`) REFERENCES `duels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `duel_answers_uq` ON `duel_answers` (`duel_id`,`user_id`,`question_index`);--> statement-breakpoint
CREATE INDEX `duel_answers_duel_idx` ON `duel_answers` (`duel_id`);--> statement-breakpoint
CREATE TABLE `duel_players` (
	`id` text PRIMARY KEY NOT NULL,
	`duel_id` text NOT NULL,
	`user_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`wrong` integer DEFAULT 0 NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`total_ms` integer DEFAULT 0 NOT NULL,
	`ready` integer DEFAULT false NOT NULL,
	`finished_at` integer,
	`league_points_before` integer DEFAULT 0 NOT NULL,
	`league_points_after` integer DEFAULT 0 NOT NULL,
	`league_points_delta` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`duel_id`) REFERENCES `duels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `duel_players_uq` ON `duel_players` (`duel_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `duels` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`challenger_id` text NOT NULL,
	`opponent_id` text NOT NULL,
	`game_key` text DEFAULT 'duello-karisik' NOT NULL,
	`question_count` integer DEFAULT 10 NOT NULL,
	`duration_sec` integer DEFAULT 90 NOT NULL,
	`questions_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`accepted_at` integer,
	`started_at` integer,
	`expires_at` integer,
	`finished_at` integer,
	`winner_id` text,
	`is_draw` integer DEFAULT false NOT NULL,
	`points_delta` integer DEFAULT 0 NOT NULL,
	`season_id` text,
	FOREIGN KEY (`challenger_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opponent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `duels_challenger_idx` ON `duels` (`challenger_id`,`status`);--> statement-breakpoint
CREATE INDEX `duels_opponent_idx` ON `duels` (`opponent_id`,`status`);--> statement-breakpoint
CREATE INDEX `duels_status_idx` ON `duels` (`status`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`addressee_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`addressee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendships_uq` ON `friendships` (`requester_id`,`addressee_id`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_idx` ON `friendships` (`addressee_id`,`status`);--> statement-breakpoint
CREATE TABLE `game_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`idx` integer NOT NULL,
	`prompt` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`options` text NOT NULL,
	`correct_index` integer NOT NULL,
	`answer_index` integer,
	`is_correct` integer,
	`answered_at` integer,
	`served_at` integer,
	`ms_taken` integer,
	`awarded_points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_questions_session_idx_uq` ON `game_questions` (`session_id`,`idx`);--> statement-breakpoint
CREATE TABLE `game_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_key` text NOT NULL,
	`variant` text NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`best_correct` integer DEFAULT 0 NOT NULL,
	`fastest_ms` integer,
	`best_time_bonus` integer DEFAULT 0 NOT NULL,
	`play_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_records_uq` ON `game_records` (`user_id`,`game_key`,`variant`);--> statement-breakpoint
CREATE INDEX `game_records_board_idx` ON `game_records` (`game_key`,`best_score`);--> statement-breakpoint
CREATE TABLE `game_results` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`game_key` text NOT NULL,
	`variant` text NOT NULL,
	`score` integer NOT NULL,
	`base_score` integer NOT NULL,
	`time_bonus` integer NOT NULL,
	`correct` integer NOT NULL,
	`wrong` integer NOT NULL,
	`best_streak` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`xp_earned` integer DEFAULT 0 NOT NULL,
	`points_earned` integer DEFAULT 0 NOT NULL,
	`is_new_record` integer DEFAULT false NOT NULL,
	`is_perfect` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_results_session_uq` ON `game_results` (`session_id`);--> statement-breakpoint
CREATE INDEX `game_results_user_idx` ON `game_results` (`user_id`,`game_key`);--> statement-breakpoint
CREATE INDEX `game_results_leaderboard_idx` ON `game_results` (`game_key`,`score`);--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_key` text NOT NULL,
	`variant` text DEFAULT 'default' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`duration_sec` integer NOT NULL,
	`question_count` integer NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`wrong` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`best_streak` integer DEFAULT 0 NOT NULL,
	`climb_step` integer DEFAULT 0 NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`ended_at` integer,
	`time_left_sec` integer DEFAULT 0 NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`points_awarded` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_sessions_user_idx` ON `game_sessions` (`user_id`,`game_key`);--> statement-breakpoint
CREATE INDEX `game_sessions_status_idx` ON `game_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `league_point_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`season_id` text,
	`delta` integer NOT NULL,
	`balance` integer NOT NULL,
	`reason` text NOT NULL,
	`duel_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `league_events_user_idx` ON `league_point_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `league_seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`icon_key` text DEFAULT 'bell' NOT NULL,
	`link` text,
	`meta` text DEFAULT '{}' NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`league_points` integer DEFAULT 0 NOT NULL,
	`league_key` text DEFAULT 'pirinc' NOT NULL,
	`peak_league_points` integer DEFAULT 0 NOT NULL,
	`duel_wins` integer DEFAULT 0 NOT NULL,
	`duel_losses` integer DEFAULT 0 NOT NULL,
	`duel_draws` integer DEFAULT 0 NOT NULL,
	`duel_streak` integer DEFAULT 0 NOT NULL,
	`best_duel_streak` integer DEFAULT 0 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`total_correct` integer DEFAULT 0 NOT NULL,
	`total_wrong` integer DEFAULT 0 NOT NULL,
	`best_time_bonus` integer DEFAULT 0 NOT NULL,
	`perfect_games` integer DEFAULT 0 NOT NULL,
	`best_answer_streak` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reserved_usernames` (
	`id` text PRIMARY KEY NOT NULL,
	`username_lower` text NOT NULL,
	`normalized` text NOT NULL,
	`reason` text DEFAULT 'MODERATION' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reserved_usernames_uq` ON `reserved_usernames` (`username_lower`);--> statement-breakpoint
CREATE INDEX `reserved_usernames_norm_idx` ON `reserved_usernames` (`normalized`);--> statement-breakpoint
CREATE TABLE `roles` (
	`key` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shop_items` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`min_level` integer DEFAULT 1 NOT NULL,
	`asset_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`user_id` text NOT NULL,
	`achievement_key` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`unlocked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `achievement_key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_key`) REFERENCES `achievements`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_daily_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_key` text NOT NULL,
	`day_key` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`target` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`claimed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_key`) REFERENCES `daily_tasks`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_daily_tasks_uq` ON `user_daily_tasks` (`user_id`,`task_key`,`day_key`);--> statement-breakpoint
CREATE INDEX `user_daily_tasks_day_idx` ON `user_daily_tasks` (`user_id`,`day_key`);--> statement-breakpoint
CREATE TABLE `user_items` (
	`user_id` text NOT NULL,
	`item_key` text NOT NULL,
	`acquired_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `item_key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_key`) REFERENCES `shop_items`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_lower` text NOT NULL,
	`username` text NOT NULL,
	`username_lower` text NOT NULL,
	`password_hash` text NOT NULL,
	`role_key` text DEFAULT 'STUDENT' NOT NULL,
	`avatar_key` text DEFAULT 'avatar-01' NOT NULL,
	`frame_key` text DEFAULT 'frame-none' NOT NULL,
	`title_key` text,
	`is_active` integer DEFAULT true NOT NULL,
	`show_stats_publicly` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_lower_uq` ON `users` (`email_lower`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_lower_uq` ON `users` (`username_lower`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role_key`);--> statement-breakpoint
CREATE INDEX `users_last_seen_idx` ON `users` (`last_seen_at`);
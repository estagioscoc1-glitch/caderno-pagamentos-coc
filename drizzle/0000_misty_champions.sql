CREATE TABLE `admin_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`iterations` integer DEFAULT 100000 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_expires_idx` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`identifier` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_book_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`folder_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_assets_workspace` ON `assets` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_channels_workspace` ON `channels` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `element_runtime_state` (
	`element_id` integer PRIMARY KEY NOT NULL,
	`visibility` text NOT NULL,
	`runtime_data_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`element_id`) REFERENCES `elements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `elements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`layer_id` integer NOT NULL,
	`name` text NOT NULL,
	`module_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`config_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`layer_id`) REFERENCES `layers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_elements_workspace` ON `elements` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_elements_channel` ON `elements` (`channel_id`);--> statement-breakpoint
CREATE INDEX `idx_elements_layer` ON `elements` (`layer_id`);--> statement-breakpoint
CREATE TABLE `layers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`name` text NOT NULL,
	`z_index` integer NOT NULL,
	`region` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_layers_channel` ON `layers` (`channel_id`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_key` text NOT NULL,
	`label` text NOT NULL,
	`version` text NOT NULL,
	`category` text NOT NULL,
	`config_schema_json` text NOT NULL,
	`data_schema_json` text NOT NULL,
	`actions_json` text NOT NULL,
	`animation_hooks_json` text NOT NULL,
	`capabilities_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modules_module_key_unique` ON `modules` (`module_key`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_width` integer DEFAULT 1920 NOT NULL,
	`base_height` integer DEFAULT 1080 NOT NULL,
	`aspect_ratio` text DEFAULT '16:9' NOT NULL,
	`safe_title_top` real,
	`safe_title_bottom` real,
	`safe_title_left` real,
	`safe_title_right` real,
	`safe_action_top` real,
	`safe_action_bottom` real,
	`safe_action_left` real,
	`safe_action_right` real,
	`theme_tokens_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

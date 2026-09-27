CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`soyad` text DEFAULT '' NOT NULL,
	`telefon` text DEFAULT '' NOT NULL,
	`vd` text DEFAULT '' NOT NULL,
	`vkn` text,
	`tc` text,
	`email` text DEFAULT '' NOT NULL,
	`bakiye_kurus` integer DEFAULT 0 NOT NULL,
	`yon` text DEFAULT 'borc' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_vkn_unique` ON `clients` (`vkn`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_tc_unique` ON `clients` (`tc`);
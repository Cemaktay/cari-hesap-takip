CREATE TABLE `movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`product_id` integer,
	`product_ad` text,
	`tarih` text NOT NULL,
	`yon` text NOT NULL,
	`tutar_kurus` integer NOT NULL,
	`aciklama` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `movements_client_date_idx` ON `movements` (`client_id`,`tarih`);
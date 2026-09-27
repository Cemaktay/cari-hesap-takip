CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad` text NOT NULL,
	`tur` text NOT NULL,
	`birim` text DEFAULT 'Adet' NOT NULL,
	`satis_kurus` integer DEFAULT 0 NOT NULL,
	`aciklama` text DEFAULT '' NOT NULL
);

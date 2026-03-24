ALTER TABLE `analyses` ADD `username` varchar(128) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `logs` ADD `username` varchar(128) DEFAULT 'free' NOT NULL;
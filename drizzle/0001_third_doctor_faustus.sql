CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceIp` varchar(45) NOT NULL,
	`userAgent` varchar(512),
	`headers` json,
	`proxyVpnScore` int NOT NULL DEFAULT 0,
	`domainScore` int NOT NULL DEFAULT 0,
	`fingerprintScore` int NOT NULL DEFAULT 0,
	`jailbreakScore` int NOT NULL DEFAULT 0,
	`manipulationScore` int NOT NULL DEFAULT 0,
	`totalScore` int NOT NULL DEFAULT 0,
	`status` enum('safe','suspicious','confirmed') NOT NULL DEFAULT 'safe',
	`detections` json,
	`asnInfo` json,
	`geoInfo` json,
	`fingerprintId` varchar(128),
	`step` enum('collecting','verifying','completed') NOT NULL DEFAULT 'collecting',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`reason` text,
	`type` enum('keyword','extension','manual') NOT NULL DEFAULT 'manual',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `domains_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `exposed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameId` varchar(128) NOT NULL,
	`discord` varchar(128),
	`photo` text,
	`description` text,
	`status` enum('active','banned','under_review','cleared') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exposed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fingerprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprintHash` varchar(128) NOT NULL,
	`sourceIp` varchar(45) NOT NULL,
	`userAgent` varchar(512),
	`headers` json,
	`seenCount` int NOT NULL DEFAULT 1,
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`ipChanges` int NOT NULL DEFAULT 0,
	`previousIps` json,
	`suspicious` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fingerprints_id` PRIMARY KEY(`id`),
	CONSTRAINT `fingerprints_fingerprintHash_unique` UNIQUE(`fingerprintHash`)
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('access','analysis','security','system') NOT NULL DEFAULT 'system',
	`level` enum('info','warn','error') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`details` json,
	`sourceIp` varchar(45),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(128) NOT NULL,
	`value` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_settingKey_unique` UNIQUE(`settingKey`)
);

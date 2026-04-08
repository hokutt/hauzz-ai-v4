CREATE TABLE `agent_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designRequestId` int,
	`stage` varchar(64) NOT NULL,
	`level` enum('info','warn','error') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`payload` json,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designRequestId` int NOT NULL,
	`conceptCardId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('selected','rejected','regeneration_requested') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concept_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designRequestId` int NOT NULL,
	`storyName` varchar(255) NOT NULL,
	`storyNarrative` text NOT NULL,
	`garmentList` json NOT NULL,
	`palette` json NOT NULL,
	`materials` json NOT NULL,
	`trims` json DEFAULT ('[]'),
	`vibeAlignment` float NOT NULL,
	`manufacturabilityScore` float NOT NULL,
	`productionRiskScore` float NOT NULL,
	`isSelected` boolean NOT NULL DEFAULT false,
	`isRejected` boolean NOT NULL DEFAULT false,
	`generationRound` int NOT NULL DEFAULT 1,
	`rawLlmOutput` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `concept_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `design_packets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designRequestId` int NOT NULL,
	`conceptCardId` int NOT NULL,
	`storyName` varchar(255) NOT NULL,
	`garmentList` json NOT NULL,
	`palette` json NOT NULL,
	`materials` json NOT NULL,
	`trims` json DEFAULT ('[]'),
	`constructionNotes` text,
	`productionRiskScore` float NOT NULL,
	`fileUrl` varchar(1024),
	`fileKey` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `design_packets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `design_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`venueSlug` varchar(64) NOT NULL,
	`eventDate` varchar(32),
	`vibeKeywords` json DEFAULT ('[]'),
	`garmentPreferences` json DEFAULT ('[]'),
	`comfortCoverage` varchar(64),
	`colors` json DEFAULT ('[]'),
	`avoidList` json DEFAULT ('[]'),
	`budgetBand` varchar(64),
	`bodyNotes` text,
	`status` enum('pending','generating','awaiting_approval','approved','in_production','complete') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garment_ontology` (
	`id` int AUTO_INCREMENT NOT NULL,
	`garmentType` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL,
	`constructionNotes` text,
	`defaultMaterials` json DEFAULT ('[]'),
	`defaultTrims` json DEFAULT ('[]'),
	`manufacturabilityBase` float DEFAULT 0.7,
	`moqTypical` int DEFAULT 10,
	`leadTimeDays` int DEFAULT 21,
	`tags` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `garment_ontology_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designRequestId` int NOT NULL,
	`designPacketId` int NOT NULL,
	`vendorId` int NOT NULL,
	`currentStage` enum('inquiry_sent','quote_received','sample','approved','production','qa','shipped','delivered') NOT NULL DEFAULT 'inquiry_sent',
	`stageHistory` json DEFAULT ('[]'),
	`quoteAmount` float,
	`currency` varchar(8) DEFAULT 'USD',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designPacketId` int NOT NULL,
	`vendorId` int NOT NULL,
	`capabilityScore` float NOT NULL,
	`timelineScore` float NOT NULL,
	`reliabilityScore` float NOT NULL,
	`priceScore` float NOT NULL,
	`communicationsScore` float NOT NULL,
	`totalScore` float NOT NULL,
	`rank` int NOT NULL,
	`scoringBreakdown` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactEmail` varchar(320),
	`contactName` varchar(255),
	`geography` varchar(128),
	`capabilities` json DEFAULT ('[]'),
	`moqMin` int DEFAULT 10,
	`turnaroundDays` int DEFAULT 30,
	`priceBand` varchar(64),
	`reliabilityScore` float DEFAULT 0.7,
	`communicationsScore` float DEFAULT 0.7,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venue_dna` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`tags` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venue_dna_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venues_id` PRIMARY KEY(`id`),
	CONSTRAINT `venues_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('founder_admin','friend_user') NOT NULL DEFAULT 'friend_user';--> statement-breakpoint
ALTER TABLE `agent_logs` ADD CONSTRAINT `agent_logs_designRequestId_design_requests_id_fk` FOREIGN KEY (`designRequestId`) REFERENCES `design_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approval_history` ADD CONSTRAINT `approval_history_designRequestId_design_requests_id_fk` FOREIGN KEY (`designRequestId`) REFERENCES `design_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approval_history` ADD CONSTRAINT `approval_history_conceptCardId_concept_cards_id_fk` FOREIGN KEY (`conceptCardId`) REFERENCES `concept_cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approval_history` ADD CONSTRAINT `approval_history_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `concept_cards` ADD CONSTRAINT `concept_cards_designRequestId_design_requests_id_fk` FOREIGN KEY (`designRequestId`) REFERENCES `design_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `design_packets` ADD CONSTRAINT `design_packets_designRequestId_design_requests_id_fk` FOREIGN KEY (`designRequestId`) REFERENCES `design_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `design_packets` ADD CONSTRAINT `design_packets_conceptCardId_concept_cards_id_fk` FOREIGN KEY (`conceptCardId`) REFERENCES `concept_cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `design_requests` ADD CONSTRAINT `design_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_designRequestId_design_requests_id_fk` FOREIGN KEY (`designRequestId`) REFERENCES `design_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_designPacketId_design_packets_id_fk` FOREIGN KEY (`designPacketId`) REFERENCES `design_packets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_scores` ADD CONSTRAINT `vendor_scores_designPacketId_design_packets_id_fk` FOREIGN KEY (`designPacketId`) REFERENCES `design_packets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_scores` ADD CONSTRAINT `vendor_scores_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venue_dna` ADD CONSTRAINT `venue_dna_venueId_venues_id_fk` FOREIGN KEY (`venueId`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;
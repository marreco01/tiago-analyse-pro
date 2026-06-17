CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`teamA` varchar(255) NOT NULL,
	`teamB` varchar(255) NOT NULL,
	`competition` varchar(255) NOT NULL,
	`matchDate` timestamp,
	`confidence` int,
	`prediction` text,
	`aiAnalysis` text,
	`statistics` text,
	`marketProbabilities` text,
	`likelyScores` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`country` varchar(255),
	`logo` text,
	`season` int,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitions_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`analysisId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`image` text,
	`source` varchar(255),
	`url` text,
	`teamId` int,
	`competitionId` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `teamStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`competitionId` int,
	`wins` int DEFAULT 0,
	`draws` int DEFAULT 0,
	`losses` int DEFAULT 0,
	`goalsFor` int DEFAULT 0,
	`goalsAgainst` int DEFAULT 0,
	`possession` int,
	`shots` int,
	`shotsOnTarget` int,
	`passes` int,
	`corners` int,
	`fouls` int,
	`yellowCards` int,
	`redCards` int,
	`xG` int,
	`xGA` int,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`country` varchar(255),
	`logo` text,
	`founded` int,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_externalId_unique` UNIQUE(`externalId`)
);

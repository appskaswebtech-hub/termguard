-- CreateTable
CREATE TABLE `InstagramAccount` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `igUserId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `accountType` VARCHAR(191) NULL,
    `accessToken` TEXT NOT NULL,
    `tokenExpiresAt` DATETIME(3) NOT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastSyncError` TEXT NULL,
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InstagramAccount_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstagramPost` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `igMediaId` VARCHAR(191) NOT NULL,
    `mediaType` VARCHAR(191) NOT NULL,
    `mediaUrl` TEXT NOT NULL,
    `thumbnailUrl` TEXT NULL,
    `permalink` TEXT NOT NULL,
    `caption` TEXT NULL,
    `carouselChildren` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstagramPost_shop_timestamp_idx`(`shop`, `timestamp`),
    UNIQUE INDEX `InstagramPost_shop_igMediaId_key`(`shop`, `igMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstagramCustomMedia` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `mediaType` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `caption` TEXT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InstagramCustomMedia_shop_position_idx`(`shop`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstagramFeed` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `postsToShow` VARCHAR(191) NOT NULL DEFAULT 'all',
    `layout` VARCHAR(191) NOT NULL DEFAULT 'grid',
    `title` VARCHAR(191) NULL,
    `onPostClick` VARCHAR(191) NOT NULL DEFAULT 'popup',
    `postSpacing` VARCHAR(191) NOT NULL DEFAULT 'small',
    `aspectRatio` VARCHAR(191) NOT NULL DEFAULT '3:4',
    `postFit` VARCHAR(191) NOT NULL DEFAULT 'cover',
    `postShape` VARCHAR(191) NOT NULL DEFAULT 'rectangle',
    `cornerRadius` INTEGER NOT NULL DEFAULT 0,
    `postSize` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `rowsDesktop` INTEGER NOT NULL DEFAULT 2,
    `colsDesktop` INTEGER NOT NULL DEFAULT 4,
    `rowsMobile` INTEGER NOT NULL DEFAULT 2,
    `colsMobile` INTEGER NOT NULL DEFAULT 2,
    `showLoadingAnimation` BOOLEAN NOT NULL DEFAULT false,
    `linkToOriginalPost` BOOLEAN NOT NULL DEFAULT false,
    `showSliderPreviews` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InstagramFeed_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


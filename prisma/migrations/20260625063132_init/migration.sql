-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` VARCHAR(191) NULL,
    `refreshTokenExpires` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `agreementText` VARCHAR(191) NOT NULL DEFAULT 'I have read and agreed with the {link} and {link-2}',
    `links` JSON NOT NULL,
    `requireAcceptance` BOOLEAN NOT NULL DEFAULT true,
    `helperText` VARCHAR(191) NOT NULL DEFAULT 'Required to complete checkout.',
    `errorMessage` VARCHAR(191) NOT NULL DEFAULT 'You must accept the terms and conditions to continue.',
    `errorDisplayType` VARCHAR(191) NOT NULL DEFAULT 'inline',
    `locationCart` BOOLEAN NOT NULL DEFAULT true,
    `locationProduct` BOOLEAN NOT NULL DEFAULT false,
    `locationCollection` BOOLEAN NOT NULL DEFAULT false,
    `locationAllCheckout` BOOLEAN NOT NULL DEFAULT false,
    `locationCustom` BOOLEAN NOT NULL DEFAULT false,
    `textColor` VARCHAR(191) NOT NULL DEFAULT '#303030',
    `fontSize` INTEGER NOT NULL DEFAULT 14,
    `fontFamily` VARCHAR(191) NOT NULL DEFAULT 'Inherit',
    `alignment` VARCHAR(191) NOT NULL DEFAULT 'Left',
    `helperTextColor` VARCHAR(191) NOT NULL DEFAULT '#6D7175',
    `helperFontSize` INTEGER NOT NULL DEFAULT 12,
    `spacingTop` INTEGER NOT NULL DEFAULT 0,
    `spacingRight` INTEGER NOT NULL DEFAULT 0,
    `spacingBottom` INTEGER NOT NULL DEFAULT 0,
    `spacingLeft` INTEGER NOT NULL DEFAULT 0,
    `checksByDefault` BOOLEAN NOT NULL DEFAULT false,
    `checkboxStyle` VARCHAR(191) NOT NULL DEFAULT 'default',
    `uncheckedColor` VARCHAR(191) NOT NULL DEFAULT '#9098A9',
    `checkedColor` VARCHAR(191) NOT NULL DEFAULT '#000000',
    `linkColor` VARCHAR(191) NOT NULL DEFAULT '#2C6ECB',
    `showLinkUnderline` BOOLEAN NOT NULL DEFAULT true,
    `openLinksNewTab` BOOLEAN NOT NULL DEFAULT true,
    `popupTitleColor` VARCHAR(191) NOT NULL DEFAULT '#202223',
    `popupMessageColor` VARCHAR(191) NOT NULL DEFAULT '#6D7175',
    `popupBtnTextColor` VARCHAR(191) NOT NULL DEFAULT '#FFFFFF',
    `popupBtnBgColor` VARCHAR(191) NOT NULL DEFAULT '#303030',
    `popupBgColor` VARCHAR(191) NOT NULL DEFAULT '#FFFFFF',
    `popupIconColor` VARCHAR(191) NOT NULL DEFAULT '#E55050',
    `customCss` TEXT NULL,
    `customScript` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Settings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `checked` BOOLEAN NOT NULL,
    `blocked` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_shop_createdAt_idx`(`shop`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `collaboratorCode` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `storePassword` VARCHAR(191) NULL,
    `pageInformation` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

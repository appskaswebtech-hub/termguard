-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `embedEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `needHelpDismissed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `previewCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `settingsCustomized` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `setupGuideDismissed` BOOLEAN NOT NULL DEFAULT false;

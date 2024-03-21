-- AlterTable
ALTER TABLE `Game` ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en';

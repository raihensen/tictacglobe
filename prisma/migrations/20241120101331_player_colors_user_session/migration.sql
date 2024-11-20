-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'PlayingOn', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `color1` VARCHAR(191) NOT NULL DEFAULT 'blue',
    ADD COLUMN `color2` VARCHAR(191) NOT NULL DEFAULT 'red',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'PlayingOn', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Session` MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'PlayingOn', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    MODIFY `turnStartTimestamp` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Session` MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    MODIFY `color1` VARCHAR(191) NOT NULL DEFAULT 'blue',
    MODIFY `color2` VARCHAR(191) NOT NULL DEFAULT 'red';

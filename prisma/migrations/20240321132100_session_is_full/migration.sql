-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `isFull` BOOLEAN NOT NULL DEFAULT false;

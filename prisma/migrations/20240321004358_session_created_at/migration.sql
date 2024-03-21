-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

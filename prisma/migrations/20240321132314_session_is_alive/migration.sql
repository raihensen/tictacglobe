-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `isAlive` BOOLEAN NOT NULL DEFAULT true;

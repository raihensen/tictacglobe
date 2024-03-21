/*
  Warnings:

  - You are about to drop the column `turnStartTimeStamp` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Game` DROP COLUMN `turnStartTimeStamp`,
    ADD COLUMN `turnStartTimestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Session` MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

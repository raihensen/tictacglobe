/*
  Warnings:

  - You are about to drop the column `startingUserId` on the `Game` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Game` DROP FOREIGN KEY `Game_startingUserId_fkey`;

-- AlterTable
ALTER TABLE `Game` DROP COLUMN `startingUserId`,
    MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Session` MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

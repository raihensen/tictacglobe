/*
  Warnings:

  - You are about to drop the column `color1` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `color2` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'PlayingOn', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Session` DROP COLUMN `color1`,
    DROP COLUMN `color2`,
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `color` VARCHAR(191) NULL;

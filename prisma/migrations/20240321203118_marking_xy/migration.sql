/*
  Warnings:

  - Added the required column `x` to the `Marking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `y` to the `Marking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized',
    MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `Marking` ADD COLUMN `x` INTEGER NOT NULL,
    ADD COLUMN `y` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Session` MODIFY `language` VARCHAR(191) NOT NULL DEFAULT 'en';

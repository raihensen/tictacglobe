/*
  Warnings:

  - Added the required column `startingUserId` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Game` ADD COLUMN `startingUserId` VARCHAR(191) NOT NULL,
    MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized';

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_startingUserId_fkey` FOREIGN KEY (`startingUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `sessionId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_sessionId_fkey`;

-- AlterTable
ALTER TABLE `Game` MODIFY `state` ENUM('Initialized', 'Running', 'Decided', 'Finished', 'Ended') NOT NULL DEFAULT 'Initialized';

-- AlterTable
ALTER TABLE `User` DROP COLUMN `sessionId`;

-- CreateTable
CREATE TABLE `_SessionToUser` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SessionToUser_AB_unique`(`A`, `B`),
    INDEX `_SessionToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_SessionToUser` ADD CONSTRAINT `_SessionToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SessionToUser` ADD CONSTRAINT `_SessionToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

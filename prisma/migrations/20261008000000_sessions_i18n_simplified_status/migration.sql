-- 杨小厨: table bills (sessions), EN/FR translations, simplified order statuses.
-- Hand-written to preserve existing data.

-- ---------- Translations ----------
ALTER TABLE `allergens` ADD COLUMN `nameFr` VARCHAR(80) NOT NULL DEFAULT '';
UPDATE `allergens` SET `nameFr` = CASE `code`
  WHEN 'GLUTEN' THEN 'Gluten'
  WHEN 'CRUSTACEANS' THEN 'Crustacés'
  WHEN 'EGGS' THEN 'Œufs'
  WHEN 'FISH' THEN 'Poisson'
  WHEN 'PEANUTS' THEN 'Arachides'
  WHEN 'SOYBEANS' THEN 'Soja'
  WHEN 'MILK' THEN 'Lait'
  WHEN 'NUTS' THEN 'Fruits à coque'
  WHEN 'CELERY' THEN 'Céleri'
  WHEN 'MUSTARD' THEN 'Moutarde'
  WHEN 'SESAME' THEN 'Sésame'
  WHEN 'SULPHITES' THEN 'Sulfites'
  WHEN 'LUPIN' THEN 'Lupin'
  WHEN 'MOLLUSCS' THEN 'Mollusques'
  ELSE `nameEn` END;
ALTER TABLE `allergens` ALTER COLUMN `nameFr` DROP DEFAULT;

ALTER TABLE `categories` ADD COLUMN `descriptionEn` VARCHAR(255) NULL,
    ADD COLUMN `descriptionFr` VARCHAR(255) NULL,
    ADD COLUMN `nameEn` VARCHAR(80) NULL,
    ADD COLUMN `nameFr` VARCHAR(80) NULL;

ALTER TABLE `ingredients` ADD COLUMN `nameEn` VARCHAR(80) NULL,
    ADD COLUMN `nameFr` VARCHAR(80) NULL;

ALTER TABLE `order_items` ADD COLUMN `productNameEnSnapshot` VARCHAR(120) NULL,
    ADD COLUMN `productNameFrSnapshot` VARCHAR(120) NULL;

ALTER TABLE `products` ADD COLUMN `descriptionEn` TEXT NULL,
    ADD COLUMN `descriptionFr` TEXT NULL,
    ADD COLUMN `nameEn` VARCHAR(120) NULL,
    ADD COLUMN `nameFr` VARCHAR(120) NULL;

ALTER TABLE `restaurants` ADD COLUMN `autoAcceptOrders` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `descriptionEn` TEXT NULL,
    ADD COLUMN `descriptionFr` TEXT NULL,
    ADD COLUMN `nameEn` VARCHAR(120) NULL,
    ADD COLUMN `nameFr` VARCHAR(120) NULL,
    ADD COLUMN `openingHoursEn` TEXT NULL,
    ADD COLUMN `openingHoursFr` TEXT NULL;

-- ---------- Simplified order statuses ----------
-- Widen, remap CONFIRMED/READY → PREPARING, then narrow.
ALTER TABLE `orders` MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `order_status_history`
    MODIFY `fromStatus` ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED') NULL,
    MODIFY `toStatus` ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED') NOT NULL;
UPDATE `orders` SET `status` = 'PREPARING' WHERE `status` IN ('CONFIRMED', 'READY');
UPDATE `order_status_history` SET `fromStatus` = 'PREPARING' WHERE `fromStatus` IN ('CONFIRMED', 'READY');
UPDATE `order_status_history` SET `toStatus` = 'PREPARING' WHERE `toStatus` IN ('CONFIRMED', 'READY');
ALTER TABLE `orders` MODIFY `status` ENUM('PENDING', 'PREPARING', 'SERVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `order_status_history`
    MODIFY `fromStatus` ENUM('PENDING', 'PREPARING', 'SERVED', 'COMPLETED', 'CANCELLED') NULL,
    MODIFY `toStatus` ENUM('PENDING', 'PREPARING', 'SERVED', 'COMPLETED', 'CANCELLED') NOT NULL;

-- ---------- Table sessions (bills) ----------
CREATE TABLE `table_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurantId` INTEGER NOT NULL,
    `tableId` INTEGER NULL,
    `tableNumberSnapshot` VARCHAR(20) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `totalAmount` DECIMAL(10, 2) NULL,
    `paymentMethod` ENUM('CASH', 'CARD', 'OTHER') NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `closedByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `legacyOrderId` INTEGER NULL,

    INDEX `table_sessions_restaurantId_status_idx`(`restaurantId`, `status`),
    INDEX `table_sessions_restaurantId_closedAt_idx`(`restaurantId`, `closedAt`),
    INDEX `table_sessions_tableId_status_idx`(`tableId`, `status`),
    INDEX `table_sessions_closedByUserId_idx`(`closedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `orders` ADD COLUMN `sessionId` INTEGER NULL;

-- Backfill: finished orders each become a closed bill (keeps reconciliation totals intact).
INSERT INTO `table_sessions` (`restaurantId`, `tableId`, `tableNumberSnapshot`, `status`, `totalAmount`, `openedAt`, `closedAt`, `createdAt`, `updatedAt`, `legacyOrderId`)
SELECT `restaurantId`, `tableId`, `tableNumberSnapshot`, 'CLOSED',
       CASE WHEN `status` = 'CANCELLED' THEN 0 ELSE `totalAmount` END,
       `createdAt`, `updatedAt`, `createdAt`, NOW(3), `id`
FROM `orders` WHERE `status` IN ('COMPLETED', 'CANCELLED');
UPDATE `orders` o JOIN `table_sessions` s ON s.`legacyOrderId` = o.`id` SET o.`sessionId` = s.`id`;

-- Active orders: one open bill per table.
INSERT INTO `table_sessions` (`restaurantId`, `tableId`, `tableNumberSnapshot`, `status`, `openedAt`, `createdAt`, `updatedAt`)
SELECT `restaurantId`, `tableId`, MIN(`tableNumberSnapshot`), 'OPEN', MIN(`createdAt`), MIN(`createdAt`), NOW(3)
FROM `orders` WHERE `sessionId` IS NULL
GROUP BY `restaurantId`, `tableId`;
UPDATE `orders` o JOIN `table_sessions` s
  ON s.`status` = 'OPEN' AND s.`restaurantId` = o.`restaurantId` AND s.`tableId` <=> o.`tableId`
SET o.`sessionId` = s.`id`
WHERE o.`sessionId` IS NULL;

ALTER TABLE `table_sessions` DROP COLUMN `legacyOrderId`;
ALTER TABLE `orders` MODIFY `sessionId` INTEGER NOT NULL;

CREATE INDEX `orders_sessionId_idx` ON `orders`(`sessionId`);

ALTER TABLE `orders` ADD CONSTRAINT `orders_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `table_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `dining_tables`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_closedByUserId_fkey` FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

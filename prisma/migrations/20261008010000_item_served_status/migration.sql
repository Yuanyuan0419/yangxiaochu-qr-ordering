-- Per-dish "served" ticks and the SERVING status (some dishes served).
ALTER TABLE `order_items` ADD COLUMN `servedAt` DATETIME(3) NULL;

ALTER TABLE `orders` MODIFY `status` ENUM('PENDING', 'PREPARING', 'SERVING', 'SERVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `order_status_history`
    MODIFY `fromStatus` ENUM('PENDING', 'PREPARING', 'SERVING', 'SERVED', 'COMPLETED', 'CANCELLED') NULL,
    MODIFY `toStatus` ENUM('PENDING', 'PREPARING', 'SERVING', 'SERVED', 'COMPLETED', 'CANCELLED') NOT NULL;

-- Orders already served or completed: mark all their dishes as served.
UPDATE `order_items` i JOIN `orders` o ON o.`id` = i.`orderId`
SET i.`servedAt` = o.`updatedAt`
WHERE o.`status` IN ('SERVED', 'COMPLETED');

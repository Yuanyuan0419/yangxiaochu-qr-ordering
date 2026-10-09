-- "Clear table" (close a bill without payment, owner password required).
ALTER TABLE `table_sessions`
    ADD COLUMN `closeType` ENUM('PAID', 'CLEARED') NULL,
    ADD COLUMN `closeNote` VARCHAR(255) NULL;

-- Every bill closed so far was a checkout.
UPDATE `table_sessions` SET `closeType` = 'PAID' WHERE `status` = 'CLOSED';

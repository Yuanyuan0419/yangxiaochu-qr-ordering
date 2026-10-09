-- Lets staff dismiss the "possibly new guests?" hint on an add-on order.
ALTER TABLE `orders` ADD COLUMN `sameGuestsConfirmed` BOOLEAN NOT NULL DEFAULT false;

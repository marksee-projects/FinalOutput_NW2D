-- ============================================================
-- Migration: Add user_id FK to reservations table
-- Run this in phpMyAdmin SQL tab against the resort_db database
-- ============================================================

-- Step 1: Add the user_id column (nullable, so existing anonymous bookings remain valid)
ALTER TABLE `reservations`
  ADD COLUMN `user_id` INT(11) DEFAULT NULL AFTER `id`;

-- Step 2: Add an index on user_id for faster lookups
ALTER TABLE `reservations`
  ADD INDEX `idx_user_id` (`user_id`);

-- Step 3: Add foreign key constraint linking to users table
ALTER TABLE `reservations`
  ADD CONSTRAINT `fk_reservations_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Step 4 (Bonus — IMP-05): Add composite index for the conflict-check query in save_booking.php
ALTER TABLE `reservations`
  ADD INDEX `idx_room_status_dates` (`room_type`, `status`, `check_in`, `check_out`);

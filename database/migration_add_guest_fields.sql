-- ============================================================
-- Migration: Add guest contact information to reservations table
-- Run this in phpMyAdmin SQL tab against the resort_db database
-- ============================================================

-- Step 1: Add the guest fields to prevent Data Loss for anonymous bookings
ALTER TABLE `reservations`
  ADD COLUMN `guest_name` VARCHAR(150) DEFAULT NULL AFTER `room_type`,
  ADD COLUMN `guest_email` VARCHAR(150) DEFAULT NULL AFTER `guest_name`,
  ADD COLUMN `guest_phone` VARCHAR(30) DEFAULT NULL AFTER `guest_email`;

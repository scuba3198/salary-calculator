-- Migration: Fix date_str month indexing (0-indexed → 1-indexed)
-- Problem: Months were stored as 0-indexed (0=Baisakh, 9=Magh)
-- Solution: Convert to 1-indexed (1=Baisakh, 10=Magh)
--
-- BEFORE: 2081-9-15 (Poush 15, stored as month 9)
-- AFTER:  2081-10-15 (Poush 15, stored as month 10)
--
-- IMPORTANT: This migration modifies ALL attendance records.
-- Back up your data before running!

-- Step 1: Create a backup table (safety measure)
CREATE TABLE IF NOT EXISTS attendance_backup AS
SELECT * FROM attendance;

-- Step 2: Add a temporary column to hold the new date_str
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS new_date_str TEXT;

-- Step 3: Update new_date_str with corrected month values
-- This regex replaces the month part (middle number) by incrementing it by 1
UPDATE attendance
SET new_date_str =
    CASE
        -- Pattern: YYYY-M-DD where M is 0-11, needs to become 1-12
        -- Extract year, increment month, keep day
        WHEN date_str ~ '^\d+-\d+-\d+$' THEN
            substr(date_str, 1, 5) ||
            (CAST(substr(date_str, 6, strpos(substr(date_str, 6), '-') - 1) AS INTEGER) + 1) ||
            substr(date_str, strpos(substr(date_str, 6), '-') + 5)
        ELSE date_str
    END;

-- Step 4: Drop the old date_str column and rename new_date_str
-- First, drop any foreign key constraints if they exist on date_str
-- (Adjust constraint name if needed)

-- Replace old column with new values
ALTER TABLE attendance DROP COLUMN date_str;
ALTER TABLE attendance RENAME COLUMN new_date_str TO date_str;

-- Step 5: Recreate index on date_str if it exists
DROP INDEX IF EXISTS attendance_date_str_idx;
CREATE INDEX attendance_date_str_idx ON attendance(date_str);

-- Step 6: Verify the migration (run this to check results)
-- SELECT * FROM attendance ORDER BY date_str DESC LIMIT 10;

-- Step 7: If everything looks good, you can drop the backup table
-- DROP TABLE attendance_backup;

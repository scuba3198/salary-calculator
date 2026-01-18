/**
 * Migration: Fix date_str month indexing (0-indexed → 1-indexed)
 *
 * Problem: Months were stored as 0-indexed (0=Baisakh, 9=Magh, 11=Chaitra)
 * Solution: Convert to 1-indexed (1=Baisakh, 10=Magh, 12=Chaitra)
 *
 * BEFORE: 2081-9-15 (stored as month 9, which is actually Magh)
 * AFTER:  2081-10-15 (stored as month 10, correctly as Magh)
 *
 * Usage:
 *   CONFIRM_MIGRATION=yes node migrations/fix_date_month_indexing.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key for migration if available (bypasses RLS)
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert date string from 0-indexed month to 1-indexed month
 * @param {string} dateStr - Date in format "YYYY-M-D"
 * @returns {string} - Date with month incremented by 1
 */
function fixMonthIndexing(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${year}-${month + 1}-${day}`;
}

/**
 * Run the migration
 */
async function migrate() {
    console.log('🔄 Starting date_str month indexing migration...\n');

    try {
        // Step 1: Fetch all attendance records
        console.log('📥 Fetching all attendance records...');
        const { data: attendance, error } = await supabase
            .from('attendance')
            .select('id, date_str');

        if (error) throw error;

        if (!attendance || attendance.length === 0) {
            console.log('✅ No attendance records found. Nothing to migrate.');
            return;
        }

        console.log(`📊 Found ${attendance.length} records\n`);

        // Step 2: Identify records that need updating
        const recordsToUpdate = [];
        for (const record of attendance) {
            const [year, month, day] = record.date_str.split('-').map(Number);

            // If month is 0-11, it needs fixing (should be 1-12)
            if (month >= 0 && month <= 11) {
                const newDateStr = fixMonthIndexing(record.date_str);
                recordsToUpdate.push({
                    id: record.id,
                    old_date_str: record.date_str,
                    new_date_str: newDateStr
                });
            }
        }

        if (recordsToUpdate.length === 0) {
            console.log('✅ All records already have correct month indexing.');
            return;
        }

        console.log(`🔧 Need to update ${recordsToUpdate.length} records\n`);
        console.log('Sample changes:');
        recordsToUpdate.slice(0, 5).forEach(r => {
            console.log(`  ${r.old_date_str} → ${r.new_date_str}`);
        });
        if (recordsToUpdate.length > 5) {
            console.log(`  ... and ${recordsToUpdate.length - 5} more`);
        }

        // Step 3: Ask for confirmation
        console.log('\n⚠️  This will modify your production data!');
        console.log('💡 Make sure you have a backup before proceeding.\n');

        // For safety, require explicit confirmation via environment variable
        if (process.env.CONFIRM_MIGRATION !== 'yes') {
            console.log('❌ Migration aborted for safety.');
            console.log('📝 To run this migration, set CONFIRM_MIGRATION=yes in your .env file');
            return;
        }

        // Step 4: Update records in batches
        console.log('\n💾 Updating records...');
        let updated = 0;
        let failed = 0;

        for (const record of recordsToUpdate) {
            const { error: updateError } = await supabase
                .from('attendance')
                .update({ date_str: record.new_date_str })
                .eq('id', record.id);

            if (updateError) {
                console.error(`❌ Failed to update ${record.old_date_str}: ${updateError.message}`);
                failed++;
            } else {
                updated++;
                if (updated % 100 === 0) {
                    console.log(`   Progress: ${updated}/${recordsToUpdate.length}`);
                }
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   Updated: ${updated} records`);
        if (failed > 0) {
            console.log(`   Failed: ${failed} records`);
        }

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    }
}

// Run the migration
migrate();

/**
 * GridGuard — Fresh Sync Script
 * This script triggers a manual crawl of the EEU Power Interruption page
 * using the new strict Addis Ababa AI logic.
 * 
 * Usage: node fresh-sync.mjs
 */

import 'dotenv/config';
import { crawlEEUInterruptions } from './lib/eeu-crawler.js';

async function runFreshSync() {
  console.log('============================================');
  console.log('GridGuard — Starting Fresh Addis Ababa Sync');
  console.log('============================================');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ Error: OPENROUTER_API_KEY is not set in .env.local');
    process.env.OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY; // Try public key
    if (!process.env.OPENROUTER_API_KEY) return;
  }

  try {
    console.log('[Sync] Initializing crawl (Strict Addis Filtering)...');
    
    // 1. Run the crawler
    const result = await crawlEEUInterruptions();
    
    console.log('\n--------------------------------------------');
    console.log('Sync Results:');
    console.log(`- Total Extracted: ${result.total}`);
    console.log(`- New Addis Entries: ${result.newEntries}`);
    console.log(`- Errors: ${result.errors.length}`);
    console.log('--------------------------------------------');
    
    if (result.newEntries > 0) {
      console.log('✅ Success! Your map is now populated with fresh Addis data.');
    } else if (result.total > 0) {
      console.log('ℹ️ No new Addis Ababa entries were found after filtering.');
    } else {
      console.log('⚠️ No power interruptions were found on the EEU page today.');
    }
    
  } catch (err) {
    console.error('❌ Fatal Sync Error:', err.message);
  }
}

runFreshSync();

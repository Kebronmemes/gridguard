// ============================================
// GridGuard — Debug Supabase Connection
// ============================================
// Run with: node debug_db.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-supabase-url')) {
  console.error('❌ Missing or default Supabase env vars in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('📡 Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  // 1. Check existing rows
  const { data: list, error: listError } = await supabase
    .from('district_history')
    .select('id')
    .limit(1);

  if (listError) {
    console.error('❌ Connection failed or table missing:', listError.message);
    return;
  }
  console.log('✅ Connected! Table exists.');

  // 2. Try a test insert
  console.log('📝 Attempting test insert...');
  const testData = {
    district: 'Debug Area',
    subcity: 'Debug Subcity',
    cause: 'Connection Test',
    start_time: new Date().toISOString(),
    type: 'planned',
    severity: 'low',
    lat: 9.0,
    lng: 38.75,
    affected_count: 0
  };

  const { data: inserted, error: insertError } = await supabase
    .from('district_history')
    .insert(testData)
    .select();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
  } else {
    console.log('✅ Insert successful! ID:', inserted[0].id);
    
    // 3. Clean up
    console.log('🧹 Cleaning up test row...');
    await supabase.from('district_history').delete().eq('id', inserted[0].id);
    console.log('✅ Cleanup done.');
  }
}

testConnection();

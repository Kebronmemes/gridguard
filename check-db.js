const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking district_history table...");
  const { data, error } = await supabase
    .from('district_history')
    .select('*')
    .is('end_time', null);

  if (error) {
    console.error("Error fetching data:", error);
  } else {
    console.log(`Found ${data.length} active outages.`);
    if (data.length > 0) {
      console.log("Sample row:", JSON.stringify(data[0], null, 2));
    }
  }

  console.log("\nChecking system_feed table...");
  const { data: feed, error: feedError } = await supabase
    .from('system_feed')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (feedError) {
    console.error("Error fetching feed:", feedError);
  } else {
    console.log(`Found ${feed.length} recent feed items.`);
    console.log(JSON.stringify(feed, null, 2));
  }
}

checkData();

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing DB credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: allOutages, error } = await supabase
    .from('district_history')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Supabase Error:", error);
    return;
  }

  console.log("----- RAW SUPABASE DATA -----");
  allOutages.forEach(o => {
    console.log(`ID: ${o.id} | Area: ${o.area} | Dist: ${o.district} | Start: ${o.start_time} | End: ${o.end_time} | Type: ${o.type}`);
  });
  console.log("-----------------------------");

  const now = new Date();
  const activeOutages = allOutages.filter(o => {
    if (!o.end_time) return true;
    const endTime = new Date(o.end_time);
    return endTime > now || o.type === 'planned';
  });

  console.log(`\nActive logic returns ${activeOutages.length} of ${allOutages.length} outages.`);
}

check();

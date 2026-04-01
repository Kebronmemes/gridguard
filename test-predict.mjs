import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Make Next.js 'unstable_noStore' a no-op so lib compiles outside Next
global.process.env.NEXT_RUNTIME = 'nodejs';

// Dynamic import so dotenv loads BEFORE Next.js imports supabase url
const predictor = await import('./lib/predictor.ts');

async function testPredictor() {
  console.log("Starting Rule Engine...");
  try {
    const predictions = await predictor.runRuleEngine();
    console.log(`Rule engine generated ${predictions.length} zones`);
    await predictor.savePredictions(predictions);
    console.log("Rule predictions saved.");

    console.log("Starting deep AI analysis...");
    await predictor.runAIEnhancement();
    console.log("AI analysis complete.");
  } catch (e) {
    console.error("Predictor failed:", e);
  }
}

testPredictor();

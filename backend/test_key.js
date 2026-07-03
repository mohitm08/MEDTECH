import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not defined in your .env file.");
  process.exit(1);
}

console.log("Checking API key connection...");
console.log(`Key Prefix: ${apiKey.substring(0, 6)}...`);

async function testConnection() {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    console.log("Sending test ping to Gemini API (gemini-2.0-flash)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: "Respond with only the word 'OK' if you receive this.",
    });
    
    const responseText = response.text.trim();
    
    console.log("\n================================================");
    console.log("  SUCCESS: Your Gemini API Key is fully working!");
    console.log(`  Model Response: ${responseText}`);
    console.log("================================================");
  } catch (error) {
    console.log("\n================================================");
    console.log("  ERROR: The API key validation check failed.");
    console.log(`  Details: ${error.message}`);
    console.log("================================================");
  }
}

testConnection();

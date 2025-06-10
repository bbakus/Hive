
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const plugins = [];
let modelConfig = {};

// Check if a real API key is set.
// This simple check assumes "YOUR_API_KEY_HERE" is the placeholder.
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_API_KEY_HERE') {
  try {
    plugins.push(googleAI());
    modelConfig = { model: 'googleai/gemini-2.0-flash' };
    console.log("GoogleAI plugin initialized for Genkit.");
  } catch (error) {
    console.error("Failed to initialize GoogleAI plugin, even with an API key present. AI features might be degraded.", error);
    // Fallback to no plugin if initialization fails, ai will be configured with empty plugins and no model
  }
} else {
  console.warn(
    'GEMINI_API_KEY is not set to a valid value in .env. ' +
    'GoogleAI plugin for Genkit will not be loaded. AI-powered features will not work.'
  );
  // Genkit will be initialized without GoogleAI, AI flows will likely fail if called.
}

export const ai = genkit({
  plugins,
  ...modelConfig,
});

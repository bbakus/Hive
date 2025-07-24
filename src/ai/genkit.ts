
import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

let aiInstance: Genkit;
let initializationError: Error | null = null;

const plugins = [];
let modelName: string | undefined = undefined;

// Check if a real API key is set.
// This simple check assumes "YOUR_API_KEY_HERE" is the placeholder.
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_API_KEY_HERE') {
  try {
    plugins.push(googleAI()); // googleAI() might throw if key is invalid or other issues
    modelName = 'googleai/gemini-2.0-flash'; // Assuming this is the desired default model
    console.log("GoogleAI plugin initialized for Genkit.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to initialize GoogleAI plugin, even with an API key present. AI features might be degraded. Error: ${errorMessage}`);
    initializationError = new Error(`GoogleAI Plugin Error: ${errorMessage}`);
    // plugins remains empty, modelName remains undefined
  }
} else {
  const warningMessage = 'GEMINI_API_KEY is not set to a valid value in .env. GoogleAI plugin for Genkit will not be loaded. AI-powered features will not work.';
  console.warn(warningMessage);
  initializationError = new Error(warningMessage); // Treat as an error for consistent handling
}

if (plugins.length > 0 && modelName) {
  aiInstance = genkit({
    plugins,
    model: modelName, // Set the default model if plugin loaded
  });
  console.log("Genkit initialized with GoogleAI plugin and default model.");
} else {
  // Create a "no-op" or "error-throwing" ai instance if initialization failed
  const finalErrorMessage = `AI system not initialized: ${initializationError?.message || 'Unknown configuration error'}`;
  console.error("Genkit AI system could not be initialized properly. AI flows will fail when executed.", initializationError);

  const createErrorThrowingFunction = (actionName: string, configName?: string) => {
    return async (...args: any[]) => {
      const detail = configName ? `"${configName}" ` : "";
      throw new Error(`${actionName} ${detail}cannot run. ${finalErrorMessage}`);
    };
  };
  
  // Cast to 'any' and then 'Genkit' to satisfy the type for this mock/fallback.
  // This is a simplified mock; a full Genkit mock would be more extensive.
  aiInstance = {
    defineFlow: (config, handler) => createErrorThrowingFunction('Flow', config.name),
    definePrompt: (config, handler) => createErrorThrowingFunction('Prompt', config.name),
    generate: createErrorThrowingFunction('Generate'),
    defineTool: (config, handler) => createErrorThrowingFunction('Tool', config.name),
    // Add other Genkit functions if they are directly used and need mocking
    // e.g., getFlow, listFlows, listModels, etc.
    // For now, this covers the most common definition and generation functions.
  } as any as Genkit;
}

export const ai = aiInstance;

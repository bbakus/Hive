
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Define and export default_api for reading local/public files (e.g., demo_data.json)
export const default_api = {
  read_file: async ({ path }: { path: string }): Promise<{ status: 'succeeded' | 'failed'; result?: string; error?: string }> => {
    // Ensure the path is treated as relative to the public folder for client-side fetch
    const fetchPath = path.startsWith('public/') ? `/${path.substring('public/'.length)}` : `/${path}`;

    try {
      const response = await fetch(fetchPath);
      if (!response.ok) {
        console.error(`Failed to fetch '${fetchPath}': ${response.status} ${response.statusText}`);
        return { status: 'failed', error: `File not found or fetch error for ${path} (status: ${response.status})` };
      }
      const content = await response.text();
      return { status: 'succeeded', result: content };
    } catch (e: any) {
      console.error(`Error fetching '${fetchPath}':`, e);
      return { status: 'failed', error: `Error fetching ${path}: ${e.message}` };
    }
  },
  // Potentially add other mock file operations here if needed by other parts of the app
  // e.g., write_file, list_files, etc., though they are not currently used by the contexts.
};

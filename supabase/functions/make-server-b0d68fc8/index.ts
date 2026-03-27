import app from '../server/index.tsx';

// Re-export the fully-configured Hono app from server/index.tsx.
// This ensures all routes (AI, auth, IPFS, messages, API) are mounted
// without duplicating routing logic in this entry-point file.
Deno.serve(app.fetch);

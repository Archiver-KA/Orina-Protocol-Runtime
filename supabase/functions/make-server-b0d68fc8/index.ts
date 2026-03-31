import app from '../server/index.tsx';

// Re-export the shared Hono app used by the active runtime surface.
// This entrypoint keeps AI, auth-claim bridge, and IPFS routes under
// the make-server-b0d68fc8 function slug without duplicating routing.
Deno.serve(app.fetch);

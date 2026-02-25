import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import walletAuthClaimBridge from '../server/wallet-auth-claim-bridge.tsx';

const app = new Hono();
const PREFIX = '/make-server-b0d68fc8';

app.use('*', logger(console.log));
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  })
);

// Supabase forwards the function slug as part of the pathname seen by the function.
// External: /functions/v1/make-server-b0d68fc8/health
// Internal pathname: /make-server-b0d68fc8/health
app.get(`${PREFIX}/health`, (c) =>
  c.json({
    ok: true,
    function: 'make-server-b0d68fc8',
    route: 'root',
    purpose: 'ATP2 H1 wallet-auth -> Supabase auth claim bridge',
  })
);

app.route(`${PREFIX}/auth/supabase-claim-bridge`, walletAuthClaimBridge);

Deno.serve(app.fetch);

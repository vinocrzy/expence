import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

/**
 * Security Plugin
 * - Configures CORS to only allow the Netlify frontend
 * - Adds security headers
 */
export default fp(async (fastify) => {
  const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';

  console.log(`Setting up Security with Allowed Origin: ${ALLOWED_ORIGIN}`);

  // 1. CORS Configuration
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps or curl requests) in Development
      if (!origin) {
        if (process.env.NODE_ENV !== 'production') {
            cb(null, true);
            return;
        }
        // In production, blocked unless we decide otherwise (e.g. mobile app)
        // For PWA on Netlify, origin will be sent.
        cb(new Error("Not allowed: No Origin"), false);
        return;
      }

      // Allow Netlify Preview Deployments (e.g. https://deploy-preview-123--site.netlify.app)
      if (origin === ALLOWED_ORIGIN || origin.endsWith('.netlify.app')) { 
         cb(null, true);
         return;
      }
      
      // Dev mode fallback
      if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        cb(null, true);
        return;
      }

      console.warn(`Blocked CORS request from: ${origin}`);
      cb(new Error("Not allowed"), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-ID', 'sentry-trace', 'baggage'],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // 2. Security Headers (Middleware equivalent)
  fastify.addHook('onRequest', async (request, reply) => {
    // Hide backend details
    reply.header('X-Powered-By', 'Anonomyous');
    
    // Prevent clickjacking
    // Note: If you want to embed the API response in an iframe on the same site, use SAMEORIGIN.
    // Given "Block all other origins", DENY is safest.
    reply.header('X-Frame-Options', 'DENY');
    
    // Content Security Policy (Strict for API)
    // We strictly limit what this API can load/execute (nothing).
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
    
    // MIME sniffing usage
    reply.header('X-Content-Type-Options', 'nosniff');
    
    // HSTS (Strict Transport Security) - 1 year
    // Only apply in production to avoid local SSL issues if not using HTTPS locally
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  });
});

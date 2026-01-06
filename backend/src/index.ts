import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import dotenv from 'dotenv';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// removed declarations

dotenv.config();

// @ts-ignore
const fastify = Fastify({
  logger: true
});

console.log("Starting server setup...");
const start = async () => {
  try {
    // Security & CORS
    await fastify.register(import('./plugins/security'));

    await fastify.register(swagger, {
        openapi: {
            info: {
                title: 'PocketTogether API',
                description: 'API for PocketTogether Finance App',
                version: '1.0.0'
            },
            servers: [{ url: 'http://localhost:4000' }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        }
    });

    await fastify.register(swaggerUi, {
        routePrefix: '/documentation',
        staticCSP: true,
        transformStaticCSP: (header: any) => header
    });
    console.log("Swagger registered");

    await fastify.register(import('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'supersecret'
    });
    console.log("JWT registered");

    fastify.decorate("authenticate", async function(request: any, reply: any) {
        // ... (keep existing auth logic, assume it's fine)
        try {
            const authHeader = request.headers.authorization;
            if (process.env.NODE_ENV === 'development' && authHeader === 'Bearer DEV_TOKEN') {
                 const prisma = require('./lib/prisma').default;
                 let user = await prisma.user.findUnique({ where: { email: 'dev@test.com' } });
                 
                 if (!user) {
                    console.log('Creating Dev User...');
                    user = await prisma.user.create({
                        data: {
                            id: 'dev-user-id', 
                            email: 'dev@test.com',
                            name: 'Dev User',
                            passwordHash: 'dev_password_hash',
                            household: {
                                create: {
                                    id: 'dev-household-id',
                                    name: 'Dev Household',
                                    categories: {
                                        create: [
                                            { name: 'Groceries', kind: 'EXPENSE', color: '#10B981' },
                                            { name: 'Rent', kind: 'EXPENSE', color: '#EF4444' },
                                            { name: 'Salary', kind: 'INCOME', color: '#3B82F6' }, 
                                            { name: 'Investments', kind: 'INCOME', color: '#8B5CF6' }
                                        ]
                                    }
                                }
                            }
                        },
                        include: { household: true }
                    });
                 }
                 
                 request.user = { 
                    id: user.id, 
                    email: user.email, 
                    name: user.name, 
                    householdId: user.householdId 
                 };
                 return;
            }

            await request.jwtVerify()
        } catch (err) {
            reply.send(err)
        }
    })
    console.log("Auth decorator registered");

    console.log("Registering routes...");
    fastify.register(import('./routes/auth.routes'));
    fastify.register(import('./routes/account.routes'));
    fastify.register(import('./routes/transaction.routes'));
    fastify.register(import('./routes/category.routes'));
    fastify.register(import('./routes/household.routes'));
    fastify.register(import('./routes/loan.routes'));
    fastify.register(import('./routes/creditCard.routes'));
    fastify.register(import('./routes/budget.routes'));
    fastify.register(import('./routes/analytics.routes'));
    fastify.register(import('./routes/report.routes'));
    console.log("Routes registered");
    
    // Health check
    fastify.get('/health', async (request: any, reply: any) => {
      return { status: 'ok' };
    });
    fastify.get('/healthz', async (request: any, reply: any) => {
      return { status: 'ok' };
    });

    const PORT = process.env.PORT || 4000;
    console.log(`Attempting to listen on ${PORT}...`);
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`Server listening on ${PORT}`);

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`Received ${signal}, closing server...`);
        await fastify.close();
        console.log('Server closed');
        process.exit(0);
      });
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

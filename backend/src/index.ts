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

const start = async () => {
  try {
    await fastify.register(import('@fastify/cors'), { 
      origin: true, // Allow all origins
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    });

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

    await fastify.register(import('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'supersecret'
    });

// @ts-ignore
    fastify.decorate("authenticate", async function(request: any, reply: any) {
        try {
            const authHeader = request.headers.authorization;
            if (process.env.NODE_ENV === 'development' && authHeader === 'Bearer DEV_TOKEN') {
                 // Upsert dev user to ensure it exists for FK constraints
                 const prisma = require('./lib/prisma').default;
                 let user = await prisma.user.findUnique({ where: { email: 'dev@test.com' } });
                 
                 if (!user) {
                    console.log('Creating Dev User...');
                    user = await prisma.user.create({
                        data: {
                            id: 'dev-user-id', // Fixed ID for consistency
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

    fastify.register(import('./routes/auth.routes'));
    fastify.register(import('./routes/account.routes'));
    fastify.register(import('./routes/transaction.routes'));
    fastify.register(import('./routes/category.routes'));
    fastify.register(import('./routes/household.routes'));
    fastify.register(import('./routes/loan.routes'));
    fastify.register(import('./routes/creditCard.routes'));
    fastify.register(import('./routes/budget.routes'));
    fastify.register(import('./routes/analytics.routes'));
    
    // Health check
    fastify.get('/healthz', async (request: any, reply: any) => {
      return { status: 'ok' };
    });

    const PORT = process.env.PORT || 4000;
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    // Keep the process alive
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

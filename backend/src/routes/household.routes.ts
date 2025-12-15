import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';

// @ts-ignore
export default async function householdRoutes(fastify: FastifyInstance) {
  
  // Get My Household
  fastify.get('/household', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    try {
        const household = await prisma.household.findUnique({
            where: { id: householdId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!household) {
            return reply.status(404).send({ error: 'Household not found' });
        }

        return household;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch household' });
    }
  });

  // Join Household by Code
  fastify.post('/household/join', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['inviteCode'],
            properties: {
                inviteCode: { type: 'string' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { inviteCode } = request.body;
    const { id: userId } = request.user;
    
    try {
        const household = await prisma.household.findFirst({
            where: { inviteCode }
        });

        if (!household) {
            return reply.status(404).send({ error: 'Invalid invite code' });
        }

        // Move user to new household
        await prisma.user.update({
            where: { id: userId },
            data: { householdId: household.id }
        });

        return { message: 'Joined household successfully', household };
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to join household' });
    }
  });
}

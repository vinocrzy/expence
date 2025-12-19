import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';

// @ts-ignore
export default async function categoryRoutes(fastify: FastifyInstance) {
  
  // List Categories
  fastify.get('/categories', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const { updatedAfter } = request.query as any;
    
    try {
        const where: any = { householdId };
        
        if (updatedAfter) {
            where.updatedAt = {
                gt: new Date(updatedAfter)
            };
        }

        const categories = await prisma.category.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        return categories;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch categories' });
    }
  });

  // Create Category
  fastify.post('/categories', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['name', 'kind'],
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                kind: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                color: { type: 'string' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { id, name, kind, color } = request.body;
    const { householdId } = request.user;

    try {
        const category = await prisma.category.create({
            data: {
                id, // Use client ID
                name,
                kind, // 'INCOME' or 'EXPENSE'
                color: color || '#808080',
                householdId
            }
        });
        return category;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to create category' });
    }
  });

  // Delete Category
  fastify.delete('/categories/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { householdId } = request.user;

    try {
        const category = await prisma.category.findFirst({
            where: { id, householdId }
        });

        if (!category) {
            return reply.status(404).send({ error: 'Category not found' });
        }

        // Optional: Check if used in transactions
        // For now, allow delete (transactions will have null category or we can restrict)
        await prisma.category.delete({ where: { id } });

        return { message: 'Category deleted' };
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to delete category' });
    }
  });
}

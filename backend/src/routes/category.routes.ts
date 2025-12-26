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

  // Update Category
  fastify.put('/categories/:id', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                color: { type: 'string' },
                isActive: { type: 'boolean' }
            }
        }
    }
  }, async (request: any, reply: any) => {
      const { id } = request.params;
      const { householdId } = request.user;
      const { name, color, isActive } = request.body;
      
      try {
          const category = await prisma.category.findFirst({ where: { id, householdId }});
          if (!category) return reply.status(404).send({ error: 'Category not found' });
          
          const updated = await prisma.category.update({
              where: { id },
              data: {
                  name: name !== undefined ? name : undefined,
                  color: color !== undefined ? color : undefined,
                  isActive: isActive !== undefined ? isActive : undefined
              }
          });
          return updated;
      } catch (e) {
          fastify.log.error(e);
          reply.status(500).send({ error: 'Failed to update category' });
      }
  });

  // Delete Category (Soft disable preferred, but if hard delete needed)
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

        const count = await prisma.transaction.count({
            where: { categoryId: id }
        });

        if (count > 0) {
             // Soft delete if transactions exist
             await prisma.category.update({
                 where: { id },
                 data: { isActive: false }
             });
             return { message: 'Category disabled (transactions exist)' };
        } else {
             // Hard delete if no transactions
             await prisma.category.delete({ where: { id } });
             return { message: 'Category deleted' };
        }
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to delete category' });
    }
  });

}

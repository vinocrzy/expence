import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';

// SQLite: AccountType removed
// import { AccountType } from '@prisma/client';

// @ts-ignore
export default async function accountRoutes(fastify: FastifyInstance) {
  
  // Create Account
  fastify.post('/accounts', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['name', 'type'],
            properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['BANK', 'CREDIT_CARD', 'CASH_RESERVE', 'INVESTMENT', 'LOAN'] },
                currency: { type: 'string' },
                balance: { type: 'number' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { name, type, currency, balance } = request.body;
    const { householdId, id: userId } = request.user;
    
    try {
        const account = await prisma.account.create({
        data: {
            name,
            type,
            currency: currency || 'USD',
            balance: balance || 0,
            householdId,
            userId
        }
        });
        return account;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to create account' });
    }
  });

  // List Accounts
  fastify.get('/accounts', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    try {
        const accounts = await prisma.account.findMany({ 
            where: { householdId },
            orderBy: { createdAt: 'desc' }
        });
        return accounts;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch accounts' });
    }
  });

  // Get Single Account
  fastify.get('/accounts/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { householdId } = request.user;

    try {
        const account = await prisma.account.findFirst({
            where: { id, householdId }
        });

        if (!account) {
            return reply.status(404).send({ error: 'Account not found' });
        }
        return account;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch account' });
    }
  });

  // Update Account
  fastify.put('/accounts/:id', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['BANK', 'CREDIT_CARD', 'CASH_RESERVE', 'INVESTMENT', 'LOAN'] },
                currency: { type: 'string' },
                balance: { type: 'number' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { householdId } = request.user;
    const { name, type, currency, balance } = request.body;

    try {
        const existing = await prisma.account.findFirst({
            where: { id, householdId }
        });

        if (!existing) {
            return reply.status(404).send({ error: 'Account not found' });
        }

        const account = await prisma.account.update({
            where: { id },
            data: { name, type, currency, balance }
        });
        return account;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to update account' });
    }
  });

  // Delete Account
  fastify.delete('/accounts/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { householdId } = request.user;

    try {
        const existing = await prisma.account.findFirst({
            where: { id, householdId }
        });

        if (!existing) {
            return reply.status(404).send({ error: 'Account not found' });
        }

        // Check if transactions exist (optional safety, skipping for now to allow easy delete)
        await prisma.account.delete({ where: { id } });
        
        return { message: 'Account deleted successfully' };
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to delete account' });
    }
  });
}

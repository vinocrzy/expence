/**
 * Backup Routes - Backend
 * Minimal backend API for encrypted backup storage only
 */

import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma';

// Type definitions (replacing zod for simplicity)
interface BackupMetadata {
  timestamp: string;
  size: number;
  recordCount: number;
  version: string;
}

interface BackupUpload {
  encryptedData: string;
  metadata: BackupMetadata;
}

interface BackupResponse extends BackupUpload {
  createdAt: string;
}

const backupRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/backup
   * Upload encrypted backup
   */
  fastify.post('/api/backup', async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { encryptedData, metadata } = request.body as BackupUpload;

    try {
      // Store encrypted backup in database
      const backup = await prisma.$executeRaw`
        INSERT INTO user_backups (id, user_id, encrypted_data, metadata, created_at)
        VALUES (
          gen_random_uuid(),
          ${userId},
          ${encryptedData},
          ${JSON.stringify(metadata)},
          NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          encrypted_data = EXCLUDED.encrypted_data,
          metadata = EXCLUDED.metadata,
          created_at = EXCLUDED.created_at
        RETURNING id
      `;

      return reply.send({
        success: true,
        backupId: 'success',
      });
    } catch (error: any) {
      fastify.log.error('Backup upload failed:', error);
      return reply.status(500).send({ error: 'Failed to save backup' });
    }
  });

  /**
   * GET /api/backup/latest
   * Get latest encrypted backup for current user
   */
  fastify.get('/api/backup/latest', async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      // Fetch latest backup
      const backup = await prisma.$queryRaw`
        SELECT encrypted_data, metadata, created_at
        FROM user_backups
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      ` as any[];

      if (!backup || backup.length === 0) {
        return reply.status(404).send({ error: 'No backup found' });
      }

      const [latestBackup] = backup;

      return reply.send({
        encryptedData: latestBackup.encrypted_data,
        metadata: latestBackup.metadata,
        createdAt: latestBackup.created_at.toISOString(),
      });
    } catch (error: any) {
      fastify.log.error('Backup retrieval failed:', error);
      return reply.status(500).send({ error: 'Failed to retrieve backup' });
    }
  });

  /**
   * GET /api/backup/history
   * Get backup history (metadata only)
   */
  fastify.get('/api/backup/history', async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const backups = await prisma.$queryRaw`
        SELECT id, metadata, created_at
        FROM user_backups
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      ` as any[];

      return reply.send({
        backups: backups.map(b => ({
          id: b.id,
          metadata: b.metadata,
          createdAt: b.created_at.toISOString(),
        })),
      });
    } catch (error: any) {
      fastify.log.error('Backup history retrieval failed:', error);
      return reply.status(500).send({ error: 'Failed to retrieve backup history' });
    }
  });

  /**
   * DELETE /api/backup
   * Delete all backups for current user
   */
  fastify.delete('/api/backup', async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      await prisma.$executeRaw`
        DELETE FROM user_backups
        WHERE user_id = ${userId}
      `;

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Backup deletion failed:', error);
      return reply.status(500).send({ error: 'Failed to delete backups' });
    }
  });
};

export default backupRoutes;

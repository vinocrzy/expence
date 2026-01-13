import { FastifyInstance } from 'fastify';
import { generateReportData } from '../services/report.service';
import { generateExcelReport } from '../services/excel.service';
import { generatePDFReport } from '../services/pdf.service';
import { ReportType, ReportFormat, ReportFilters } from '../schemas/report.schema';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 exports per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// @ts-ignore - FastifyInstance type compatibility
export default async function reportRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /reports/export
   * Generate and download a report in Excel or PDF format
   */
  fastify.post('/reports/export', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Export a financial report',
      tags: ['Reports'],
      body: {
        type: 'object',
        required: ['type', 'format', 'filters'],
        properties: {
          type: { 
            type: 'string',
            enum: ['EXPENSE', 'INCOME', 'ACCOUNT_SUMMARY', 'LOAN', 'CREDIT_CARD', 'BUDGET_VS_ACTUAL', 'TRIP_EVENT', 'YEARLY_SUMMARY']
          },
          format: {
            type: 'string',
            enum: ['EXCEL', 'PDF']
          },
          filters: {
            type: 'object',
            required: ['startDate', 'endDate'],
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              accountIds: { 
                type: 'array',
                items: { type: 'string' }
              },
              categoryIds: {
                type: 'array',
                items: { type: 'string' }
              },
              tags: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: any, reply: any) => {
    const { id: userId, householdId } = request.user;
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        message: 'You can export up to 10 reports per hour. Please try again later.'
      });
    }
    
    const { type, format, filters } = request.body as {
      type: ReportType;
      format: ReportFormat;
      filters: ReportFilters;
    };
    
    try {
      // Validate date range
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.status(400).send({
          error: 'Invalid date range',
          message: 'Please provide valid start and end dates in ISO format'
        });
      }
      
      if (startDate > endDate) {
        return reply.status(400).send({
          error: 'Invalid date range',
          message: 'Start date must be before end date'
        });
      }
      
      // Generate report data
      request.log.info(`Generating ${type} report for household ${householdId}`);
      const reportData = await generateReportData(householdId, type, filters);
      
      // Generate file based on format
      let buffer: Buffer;
      let contentType: string;
      let filename: string;
      
      if (format === 'EXCEL') {
        buffer = await generateExcelReport(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${type.toLowerCase()}-report-${filters.startDate}-to-${filters.endDate}.xlsx`;
      } else {
        buffer = await generatePDFReport(reportData);
        contentType = 'application/pdf';
        filename = `${type.toLowerCase()}-report-${filters.startDate}-to-${filters.endDate}.pdf`;
      }
      
      // Send file
      reply
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', buffer.length)
        .send(buffer);
        
    } catch (error: any) {
      request.log.error(error);
      
      // Check if it's a data access error (trying to access other household's data)
      if (error.message?.includes('household')) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this data'
        });
      }
      
      return reply.status(500).send({
        error: 'Report generation failed',
        message: error.message || 'An error occurred while generating the report'
      });
    }
  });
  
  /**
   * GET /reports/metadata
   * Get metadata for building report filters (available accounts, categories, tags)
   */
  fastify.get('/reports/metadata', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    try {
      const prisma = require('../lib/prisma').default;
      
      // Get accounts
      const accounts = await prisma.account.findMany({
        where: { householdId, isArchived: false },
        select: { id: true, name: true, type: true }
      });
      
      // Get categories
      const categories = await prisma.category.findMany({
        where: { householdId, isActive: true },
        select: { id: true, name: true, kind: true, color: true }
      });
      
      // Get unique tags from transactions
      const transactions = await prisma.transaction.findMany({
        where: { 
          account: { householdId },
          tags: { not: null }
        },
        select: { tags: true },
        distinct: ['tags']
      });
      
      // Extract unique tags
      const tagsSet = new Set<string>();
      transactions.forEach((t: any) => {
        if (t.tags) {
          // Handle comma-separated or JSON array
          try {
            const tagArray = JSON.parse(t.tags);
            if (Array.isArray(tagArray)) {
              tagArray.forEach(tag => tagsSet.add(tag));
            }
          } catch {
            // Assume comma-separated
            t.tags.split(',').forEach((tag: string) => tagsSet.add(tag.trim()));
          }
        }
      });
      
      return {
        accounts,
        categories,
        tags: Array.from(tagsSet).filter(tag => tag.length > 0)
      };
      
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch metadata',
        message: error.message
      });
    }
  });
}

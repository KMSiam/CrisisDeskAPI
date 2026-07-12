import { z } from 'zod';

export const createReportSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    contact: z.string().optional(),
    location: z.string({
      required_error: 'Description and location are required.'
    }).trim().min(1, 'Description and location are required.'),
    description: z.string({
      required_error: 'Description and location are required.'
    }).trim().min(1, 'Description and location are required.'),
    language: z.enum(['bn', 'en', 'unknown']).optional().default('unknown'),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Report ID is required.'),
  }),
  body: z.object({
    status: z.enum(['pending', 'in_review', 'assigned', 'resolved', 'rejected'], {
      required_error: 'Status is required.',
      invalid_type_error: 'Invalid status value.'
    }),
  }),
});

export const getReportSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Report ID is required.'),
  }),
});

export const listReportsQuerySchema = z.object({
  query: z.object({
    category: z.enum(['medical', 'fire', 'accident', 'crime', 'flood', 'utility', 'public_service', 'infrastructure', 'other']).optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['pending', 'in_review', 'assigned', 'resolved', 'rejected']).optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  }),
});

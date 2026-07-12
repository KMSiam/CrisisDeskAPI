import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock the external service calls to prevent hitting real APIs during tests
vi.mock('../../src/services/aiProviderManager.js', () => {
  const mockInstance = {
    classifyReport: vi.fn().mockResolvedValue({
      category: 'medical',
      urgency: 'critical',
      summary: 'Mocked summary description.',
      suggestedAction: 'Mocked recommended action.',
      confidence: 0.95,
      provider: 'mock-gemini'
    })
  };
  return {
    AIProviderManager: {
      getInstance: () => mockInstance
    },
    default: {
      getInstance: () => mockInstance
    }
  };
});

vi.mock('../../src/services/embeddingService.js', () => {
  const mockService = {
    generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
  };
  return {
    EmbeddingService: mockService,
    default: mockService
  };
});

vi.mock('../../src/services/translationService.js', () => {
  const mockService = {
    translateAndDetect: vi.fn().mockResolvedValue({
      translatedDescription: 'Mocked translated English description.',
      language: 'bn'
    })
  };
  return {
    TranslationService: mockService,
    default: mockService
  };
});

describe('CrisisDeskAI REST API Integration Tests', () => {
  let adminToken = '';
  let createdReportId = '';

  beforeAll(async () => {
    // Clean tables before tests
    await prisma.report.deleteMany({});
    await prisma.admin.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Auth Endpoints', () => {
    it('should register a new admin user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testadmin@crisisdesk.com',
          password: 'password123',
          name: 'Test Admin'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.admin.email).toBe('testadmin@crisisdesk.com');
    });

    it('should login an existing admin user and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testadmin@crisisdesk.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      adminToken = res.body.data.token;
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testadmin@crisisdesk.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Reports Endpoints', () => {
    it('should create a new report successfully', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          name: 'Citizen Khan',
          contact: '01711122233',
          location: 'Dhaka Airport Road',
          description: 'A violent accident between two cars.',
          language: 'bn'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.category).toBe('medical');
      expect(res.body.data.urgency).toBe('critical');
      expect(res.body.data.status).toBe('pending');
      createdReportId = res.body.data.id;
    });

    it('should return 400 when creating report with missing fields', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          name: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Description and location are required.');
    });

    it('should list reports with filters', async () => {
      const res = await request(app)
        .get('/api/reports')
        .query({
          category: 'medical',
          urgency: 'critical',
          page: 1,
          limit: 10
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reports).toBeInstanceOf(Array);
      expect(res.body.data.reports.length).toBeGreaterThan(0);
    });

    it('should retrieve single report details by ID', async () => {
      const res = await request(app)
        .get(`/api/reports/${createdReportId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdReportId);
    });

    it('should return 404 for non-existent report ID', async () => {
      const res = await request(app)
        .get('/api/reports/nonexistentcuid12345');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should get stats summary', async () => {
      const res = await request(app)
        .get('/api/reports/stats/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalReports');
      expect(res.body.data).toHaveProperty('categoryBreakdown');
    });

    it('should prevent updating report status without JWT token', async () => {
      const res = await request(app)
        .patch(`/api/reports/${createdReportId}/status`)
        .send({
          status: 'assigned'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should update report status with admin JWT token', async () => {
      const res = await request(app)
        .patch(`/api/reports/${createdReportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'assigned'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('assigned');
    });

    it('should prevent deleting report without JWT token', async () => {
      const res = await request(app)
        .delete(`/api/reports/${createdReportId}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should delete report with admin JWT token', async () => {
      const res = await request(app)
        .delete(`/api/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it was deleted
      const checkRes = await request(app)
        .get(`/api/reports/${createdReportId}`);
      expect(checkRes.status).toBe(404);
    });
  });
});

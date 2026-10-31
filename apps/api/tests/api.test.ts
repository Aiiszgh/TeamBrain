import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('TeamBrain API Integration Tests', () => {
  const app = createApp();

  describe('Health Endpoints', () => {
    it('GET /api/health/live returns 200 with status ok', async () => {
      const res = await request(app).get('/api/health/live');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(typeof res.body.uptime, 'number');
    });

    it('GET /api/health returns 503 when database is not connected', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 503);
      assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
    });
  });

  describe('Authentication & Authorization Guards', () => {
    it('POST /api/auth/register fails with 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bad@test.com' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('POST /api/auth/register rejects short passwords (< 10 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'valid@example.com',
          password: 'short',
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.match(res.body.error.message, /10 characters/i);
    });

    it('POST /api/auth/login fails with 400 when missing email or password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'only@email.com' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('GET /api/auth/me returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/teams returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/teams');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/teams returns 401 without Bearer token', async () => {
      const res = await request(app).post('/api/teams').send({ name: 'Alpha' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/projects returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/projects?teamId=123');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/memories returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/memories?scope=personal');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/memories/search returns 401 without Bearer token', async () => {
      const res = await request(app)
        .post('/api/memories/search')
        .send({ query: 'test' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/conversations returns 401 without Bearer token', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .send({ teamId: 'fake' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/memories/fuse returns 401 without Bearer token', async () => {
      const res = await request(app)
        .post('/api/memories/fuse')
        .send({ teamId: 'fake' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('POST /api/memories/resolve returns 401 without Bearer token', async () => {
      const res = await request(app)
        .post('/api/memories/resolve')
        .send({ teamId: 'fake', memoryIds: [], content: 'test' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });
  });
});

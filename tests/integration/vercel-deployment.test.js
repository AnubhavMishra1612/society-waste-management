import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import handler from '../../api/index.js';
import express from 'express';

describe('Vercel Serverless Entry Point & Production Auth Integration Suite', () => {
  let app;

  beforeAll(() => {
    // In Vercel serverless environment, the export from api/index.js is an HTTP handler function
    // Wrap with supertest to test full serverless invocation
    app = handler;
  });

  it('TC-VERCEL-01: Health check endpoint is accessible via Vercel entry point', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toContain('SocietyClean');
  });

  it('TC-VERCEL-02: Resident authenticates successfully and receives JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'resident@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('resident');
    expect(res.body.data.user.email).toBe('resident@greenvista.org');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined(); // Security invariant
  });

  it('TC-VERCEL-03: Staff authenticates successfully and receives JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('staff');
    expect(res.body.data.user.email).toBe('staff@greenvista.org');
    expect(res.body.data.token).toBeDefined();
  });

  it('TC-VERCEL-04: Manager authenticates successfully and receives JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('manager');
    expect(res.body.data.user.email).toBe('manager@greenvista.org');
    expect(res.body.data.token).toBeDefined();
  });

  it('TC-VERCEL-05: Authentication fails with 401 for incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'resident@greenvista.org',
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('TC-VERCEL-06: Authentication fails with 401 for unregistered email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('TC-VERCEL-07: Authentication fails with 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'resident@greenvista.org'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('TC-VERCEL-08: Unknown API route returns structured 404 JSON error instead of HTML', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

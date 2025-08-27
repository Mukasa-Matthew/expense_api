const request = require('supertest');
const app = require('../server');

describe('Basic API Tests', () => {
    test('Health check endpoint should return 200', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.message).toBe('Expense Tracker Backend is running');
    });

    test('404 handler should return 404 for unknown routes', async () => {
        const response = await request(app).get('/api/unknown');
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Route not found');
    });

    test('Protected routes should require authentication', async () => {
        const response = await request(app).get('/api/expenses');
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Not authorized, no token');
    });
});

describe('Authentication Endpoints', () => {
    test('Registration should validate required fields', async () => {
        const response = await request(app).post('/api/auth/register').send({});
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    test('Login should validate required fields', async () => {
        const response = await request(app).post('/api/auth/login').send({});
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Set test environment before importing server
process.env.NODE_ENV = 'test';

// Start a mock FastAPI backend server
let mockStatus = 200;
let mockResponseBody: any = {};
let capturedRequest: { method?: string; url?: string; headers?: http.IncomingHttpHeaders; body?: any } = {};

const mockBackend = http.createServer((req, res) => {
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk;
  });
  req.on('end', () => {
    capturedRequest = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: rawBody ? JSON.parse(rawBody) : {},
    };
    res.writeHead(mockStatus, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockResponseBody));
  });
});

let backendPort: number;
let expressPort: number;
let expressServer: http.Server;

test.before(async () => {
  await new Promise<void>(resolve => {
    mockBackend.listen(0, () => {
      backendPort = (mockBackend.address() as AddressInfo).port;
      process.env.BACKEND_URL = `http://127.0.0.1:${backendPort}`;
      resolve();
    });
  });

  // Dynamically import server after setting BACKEND_URL
  const { app } = await import('../../server.ts');
  await new Promise<void>(resolve => {
    expressServer = app.listen(0, () => {
      expressPort = (expressServer.address() as AddressInfo).port;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>(resolve => expressServer.close(() => resolve()));
  await new Promise<void>(resolve => mockBackend.close(() => resolve()));
});

test('Express Proxy: forwards generate-questions to FastAPI and returns candidates on 200', async () => {
  mockStatus = 200;
  mockResponseBody = [
    {
      id: 'mock-cand-1',
      prompt: 'What is polymorphism?',
      type: 'multiple_choice',
      difficulty: 'medium',
      points: 2,
    },
  ];

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token-123',
    },
    body: JSON.stringify({
      course_id: 'c1111111-1111-1111-1111-111111111111',
      topic_id: 't1111111-1111-1111-1111-111111111111',
      difficulty: 'medium',
      count: 1,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.source, 'fastapi');
  assert.equal(data.candidates.length, 1);
  assert.equal(data.candidates[0].id, 'mock-cand-1');

  // Verify headers and body were forwarded
  assert.equal(capturedRequest.url, '/api/v1/ai/generate-questions');
  assert.equal(capturedRequest.headers?.authorization, 'Bearer test-token-123');
  assert.equal(capturedRequest.body.course_id, 'c1111111-1111-1111-1111-111111111111');
});

test('Express Proxy: forwards 401 Unauthorized from FastAPI without fallback', async () => {
  mockStatus = 401;
  mockResponseBody = { detail: 'Not authenticated' };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id: 'c1' }),
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.detail, 'Not authenticated');
  assert.equal(data.candidates, undefined);
  assert.notEqual(data.source, 'deterministic_fallback');
});

test('Express Proxy: forwards 403 Forbidden from FastAPI without fallback', async () => {
  mockStatus = 403;
  mockResponseBody = { detail: 'Must be assigned teacher or administrator' };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer student-token',
    },
    body: JSON.stringify({ course_id: 'c1' }),
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.detail, 'Must be assigned teacher or administrator');
  assert.equal(data.candidates, undefined);
  assert.notEqual(data.source, 'deterministic_fallback');
});

test('Express Proxy: forwards 422 Unprocessable Content from FastAPI without fallback', async () => {
  mockStatus = 422;
  mockResponseBody = { detail: [{ loc: ['body', 'course_id'], msg: 'field required' }] };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 422);
  const data = await res.json();
  assert.ok(Array.isArray(data.detail));
  assert.equal(data.candidates, undefined);
});

test('Express Proxy: forwards 429 Rate Limit from FastAPI safely', async () => {
  mockStatus = 429;
  mockResponseBody = { detail: 'Too many requests' };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id: 'c1' }),
  });

  assert.equal(res.status, 429);
  const data = await res.json();
  assert.equal(data.detail, 'Too many requests');
  assert.equal(data.candidates, undefined);
});

test('Express Proxy: forwards 500 Internal Error from FastAPI safely', async () => {
  mockStatus = 500;
  mockResponseBody = { detail: 'Internal server error' };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id: 'c1' }),
  });

  assert.equal(res.status, 500);
  const data = await res.json();
  assert.equal(data.detail, 'Internal server error');
  assert.equal(data.candidates, undefined);
});

test('Express Proxy: returns 503 when FastAPI backend is unreachable, with no fabricated content', async () => {
  // Use a port where no server is listening
  const invalidUrl = 'http://127.0.0.1:59999';
  const originalUrl = process.env.BACKEND_URL;
  process.env.BACKEND_URL = invalidUrl;

  try {
    const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: 'c1111111-1111-1111-1111-111111111111',
        topic_id: 't1111111-1111-1111-1111-111111111111',
      }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'AI generation service unavailable');
    assert.equal(data.candidates, undefined);
    assert.notEqual(data.source, 'deterministic_fallback');
  } finally {
    process.env.BACKEND_URL = originalUrl;
  }
});

test('Express Proxy: forwards simplify-lesson to FastAPI and maps response on 200', async () => {
  mockStatus = 200;
  mockResponseBody = {
    success: true,
    explanation: 'Simplified explanation from FastAPI',
    source: 'gemini',
    is_cached: false,
    prompt_used: 'simplify',
  };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/simplify-lesson`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer student-token',
    },
    body: JSON.stringify({
      lesson_id: 'l1111111-1111-1111-1111-111111111111',
      mode: 'simplify',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.explanation, 'Simplified explanation from FastAPI');
  assert.equal(data.source, 'gemini');
  assert.equal(data.isCached, false);
  assert.equal(data.promptUsed, 'simplify');

  assert.equal(capturedRequest.url, '/api/v1/ai/simplify-lesson');
  assert.equal(capturedRequest.headers?.authorization, 'Bearer student-token');
});

test('Express Proxy: simplify-lesson forwards 403 Forbidden without fallback', async () => {
  mockStatus = 403;
  mockResponseBody = { detail: 'Must be enrolled in the course to access lesson AI tutoring' };

  const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/simplify-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lesson_id: 'l1111111-1111-1111-1111-111111111111',
      mode: 'simplify',
    }),
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.detail, 'Must be enrolled in the course to access lesson AI tutoring');
  assert.equal(data.explanation, undefined);
  assert.notEqual(data.source, 'deterministic_fallback');
});

test('Express Proxy: simplify-lesson returns 503 when backend is unreachable, with no templates', async () => {
  const invalidUrl = 'http://127.0.0.1:59999';
  const originalUrl = process.env.BACKEND_URL;
  process.env.BACKEND_URL = invalidUrl;

  try {
    const res = await fetch(`http://127.0.0.1:${expressPort}/api/ai/simplify-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: 'l1111111-1111-1111-1111-111111111111',
        mode: 'analogy',
      }),
    });

    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'AI tutoring service unavailable');
    assert.equal(data.explanation, undefined);
    assert.notEqual(data.source, 'deterministic_fallback');
  } finally {
    process.env.BACKEND_URL = originalUrl;
  }
});

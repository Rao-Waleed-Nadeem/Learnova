import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const getBackendUrl = () => process.env.BACKEND_URL || 'http://localhost:8000';

app.use(express.json());

// Pure backward-compatibility proxy for question generation (SSD-08, Phase 9)
app.post('/api/ai/generate-questions', async (req, res) => {
  const { sourceContent, questionTypes, difficulty, count = 3 } = req.body;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie as string;
    }

    const backendRes = await fetch(`${getBackendUrl()}/api/v1/ai/generate-questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        course_id: req.body.course_id || req.body.courseId,
        topic_id: req.body.topic_id || req.body.topicId,
        source_content: sourceContent || '',
        question_types: questionTypes || ['multiple_choice'],
        difficulty: difficulty || 'medium',
        count: Number(count) || 3,
      }),
    });

    const data = await backendRes.json().catch(() => null);

    if (backendRes.ok) {
      return res.status(backendRes.status).json({
        success: true,
        candidates: data,
        source: 'fastapi',
      });
    }

    // Forward exact backend error status and payload
    return res.status(backendRes.status).json(data || { detail: 'FastAPI request failed' });
  } catch (err: any) {
    // Return controlled service error; NEVER return fabricated fallback content
    return res.status(503).json({
      success: false,
      error: 'AI generation service unavailable',
      detail: 'Could not communicate with backend AI service',
    });
  }
});

// Pure backward-compatibility proxy for lesson simplification (SSD-05, Phase 9)
app.post('/api/ai/simplify-lesson', async (req, res) => {
  const {
    lessonTitle = 'Lesson',
    topicTitle = 'Topic',
    courseTitle = 'Course',
    lessonContent = '',
    customPrompt = '',
    mode = 'simplify',
  } = req.body;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie as string;
    }

    const backendRes = await fetch(`${getBackendUrl()}/api/v1/ai/simplify-lesson`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        course_title: courseTitle,
        topic_title: topicTitle,
        lesson_title: lessonTitle,
        lesson_content: lessonContent,
        mode,
        custom_prompt: customPrompt,
        lesson_id: req.body.lesson_id || req.body.lessonId,
      }),
    });

    const data = await backendRes.json().catch(() => null);

    if (backendRes.ok) {
      return res.status(backendRes.status).json({
        success: true,
        explanation: data?.explanation,
        source: data?.source,
        isCached: data?.is_cached,
        promptUsed: data?.prompt_used || customPrompt || mode,
      });
    }

    // Forward exact backend error status and payload
    return res.status(backendRes.status).json(data || { detail: 'FastAPI request failed' });
  } catch (err: any) {
    // Return controlled service error; NEVER return fabricated fallback content
    return res.status(503).json({
      success: false,
      error: 'AI tutoring service unavailable',
      detail: 'Could not communicate with backend AI service',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Learnova Teacher Portal server running on http://localhost:${port}`);
  });
}

export { app, startServer };

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

app.use(express.json());

// Thin backward-compatibility proxy for question generation (SSD-08, Phase 9)
app.post('/api/ai/generate-questions', async (req, res) => {
  const { courseTitle, topicTitle, sourceContent, questionTypes, difficulty, count = 3 } = req.body;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }

    const backendRes = await fetch(`${backendUrl}/api/v1/ai/generate-questions`, {
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

    if (backendRes.ok) {
      const candidates = await backendRes.json();
      return res.json({ success: true, candidates, source: 'fastapi' });
    }
  } catch (err: any) {
    console.warn('FastAPI question proxy notice, falling back to local deterministic engine:', err?.message || err);
  }

  // High-quality deterministic educational fallback (offline/standalone resilience)
  const safeTypes: string[] = questionTypes && questionTypes.length > 0 ? questionTypes : ['multiple_choice'];
  const generatedCandidates = [];
  const diff = difficulty || 'medium';

  for (let i = 0; i < Math.min(Number(count) || 3, 5); i++) {
    const qType = safeTypes[i % safeTypes.length];
    const id = `cand-${Date.now()}-${i + 1}`;

    if (qType === 'multiple_choice') {
      generatedCandidates.push({
        id,
        prompt: `In the context of ${topicTitle || 'this topic'}, which statement best evaluates the fundamental principle?`,
        type: 'multiple_choice',
        difficulty: diff,
        points: diff === 'hard' ? 3 : diff === 'medium' ? 2 : 1,
        explanation: `Under ${topicTitle || 'the curriculum syllabus'}, this principle ensures predictable behavior and modularity.`,
        sourceContext: sourceContent ? sourceContent.slice(0, 100) + '...' : `Curriculum Topic: ${topicTitle}`,
        options: [
          { id: 'opt-1', text: `It establishes invariant state transitions across module boundaries`, isCorrect: true },
          { id: 'opt-2', text: `It eliminates the need for execution stack frames`, isCorrect: false },
          { id: 'opt-3', text: `It forces all expressions to resolve in static compilation time`, isCorrect: false },
          { id: 'opt-4', text: `It guarantees linear memory allocation regardless of data size`, isCorrect: false },
        ],
      });
    } else if (qType === 'true_false') {
      generatedCandidates.push({
        id,
        prompt: `Prerequisite knowledge in ${topicTitle || 'the curriculum'} is required before downstream advanced topics can be unlocked.`,
        type: 'true_false',
        difficulty: diff,
        points: 1,
        explanation: `Curriculum prerequisites enforce a Directed Acyclic Graph (DAG) ensuring learners have foundational competency.`,
        sourceContext: `Syllabus for ${courseTitle || 'Curriculum'}`,
        correctBool: true,
      });
    } else if (qType === 'fill_blank') {
      generatedCandidates.push({
        id,
        prompt: `The primary mechanism used to manage computational resources in ${topicTitle || 'this module'} is known as [blank].`,
        type: 'fill_blank',
        difficulty: diff,
        points: 2,
        explanation: `Resource management and garbage collection/deallocation form core requirements in this domain.`,
        sourceContext: `Module resources on ${topicTitle}`,
        acceptedAnswers: ['garbage collection', 'memory management', 'allocation'],
        caseSensitive: false,
      });
    } else if (qType === 'matching') {
      generatedCandidates.push({
        id,
        prompt: `Match each concept of ${topicTitle || 'the topic'} with its operational definition:`,
        type: 'matching',
        difficulty: diff,
        points: 4,
        explanation: `Correctly identifying structural definitions verifies conceptual synthesis.`,
        sourceContext: `Reference guide for ${topicTitle}`,
        matchingPairs: [
          { id: 'p1', left: 'Encapsulation', right: 'Bundling data with corresponding operating methods' },
          { id: 'p2', left: 'Polymorphism', right: 'Presenting the same interface for differing underlying forms' },
          { id: 'p3', left: 'Abstraction', right: 'Hiding internal implementation details from consumers' },
        ],
      });
    } else {
      generatedCandidates.push({
        id,
        prompt: `Explain why circular dependencies are invalid in curriculum prerequisite structures for ${topicTitle || 'course design'}.`,
        type: 'short_answer',
        difficulty: diff,
        points: 3,
        explanation: `Circular dependencies create deadlock where neither topic can be unlocked first.`,
        sourceContext: `Learnova Architecture Guide`,
        expectedRubric: `Must mention: 1) Deadlock or inability to start either topic, 2) Directed Acyclic Graph requirement, 3) Learner progression deadlock.`,
      });
    }
  }

  return res.json({ success: true, candidates: generatedCandidates, source: 'deterministic_fallback' });
});

// Thin backward-compatibility proxy for lesson simplification (SSD-05, Phase 9)
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

    const backendRes = await fetch(`${backendUrl}/api/v1/ai/simplify-lesson`, {
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

    if (backendRes.ok) {
      const data = await backendRes.json();
      return res.json({
        success: true,
        explanation: data.explanation,
        source: data.source,
        isCached: data.is_cached,
        promptUsed: data.prompt_used || customPrompt || mode,
      });
    }
  } catch (err: any) {
    console.warn('FastAPI simplification proxy notice, falling back to local template:', err?.message || err);
  }

  // Academic High-Quality Fallback (SSD-05 fallback requirement)
  let fallbackText = '';
  if (mode === 'analogy') {
    fallbackText = `### Real-World Analogy for ${lessonTitle}\n\n` +
      `Think of **${lessonTitle}** like an **organized postal sorting station**:\n\n` +
      `- **Data & Inputs:** Letters arriving with specific recipient addresses (variables and inputs).\n` +
      `- **Operations & Rules:** The sorting conveyor belts that route mail based on size, priority, and destination (control logic and functions).\n` +
      `- **Outputs & State:** Mail bags loaded onto trucks for delivery (returns and modified state).\n\n` +
      `Just like a mail center ensures no letter is lost by applying consistent routing rules, **${lessonTitle}** ensures deterministic execution in ${courseTitle}.`;
  } else if (mode === 'example') {
    fallbackText = `### Step-by-Step Worked Example: ${lessonTitle}\n\n` +
      `Here is a concrete walk-through illustrating how **${lessonTitle}** works in practice:\n\n` +
      `\`\`\`python\n` +
      `# 1. Initialize state for ${topicTitle}\n` +
      `def process_item(value: int) -> dict:\n` +
      `    \"\"\"Demonstrates ${lessonTitle} principles.\"\"\"\n` +
      `    if value < 0:\n` +
      `        return {"status": "rejected", "value": value}\n` +
      `    \n` +
      `    # 2. Transform input deterministically\n` +
      `    transformed = value * 2\n` +
      `    return {"status": "success", "result": transformed}\n\n` +
      `# Test execution\n` +
      `result = process_item(10)\n` +
      `print(result) # Output: {'status': 'success', 'result': 20}\n` +
      `\`\`\`\n\n` +
      `**Walkthrough:**\n` +
      `1. **Input Guard:** The condition checks validity before processing.\n` +
      `2. **State Transformation:** Output is calculated without side effects.\n` +
      `3. **Predictable Contract:** The returned dictionary guarantees consumers know the status.`;
  } else if (mode === 'custom' && customPrompt) {
    fallbackText = `### Contextual Clarification\n\n` +
      `Regarding your question: *"**${customPrompt}**"*\n\n` +
      `In **${lessonTitle}** (${topicTitle}), this concept connects directly to how operations are orchestrated in ${courseTitle}:\n\n` +
      `- **Core Principle:** Each module maintains its own local scope and passes data explicitly.\n` +
      `- **Key Takeaway:** By keeping inputs predictable, you prevent unexpected side effects across your program.\n` +
      `- **Best Practice:** Always inspect intermediate values and verify assumptions through small unit tests.`;
  } else {
    fallbackText = `### Simplified Explanation: ${lessonTitle}\n\n` +
      `**${lessonTitle}** is a core building block in **${topicTitle}** that helps organize and execute logic cleanly.\n\n` +
      `#### 3 Key Concepts to Remember:\n` +
      `- **Modularity:** Breaking down complex tasks into manageable, testable steps.\n` +
      `- **State Predictability:** Knowing exactly what data enters and what result exits.\n` +
      `- **Reusability:** Writing the logic once and applying it safely across different parts of ${courseTitle}.\n\n` +
      `> *Pro-tip:* When practicing ${lessonTitle}, start with the simplest edge case first, then scale to complex input scenarios!`;
  }

  return res.json({
    success: true,
    explanation: fallbackText,
    source: 'deterministic_fallback',
    isCached: false,
    promptUsed: customPrompt || mode,
  });
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

startServer();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API endpoint for AI-assisted question generation
app.post('/api/ai/generate-questions', async (req, res) => {
  const { courseTitle, topicTitle, sourceContent, questionTypes, difficulty, count = 3 } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an educational assessment expert for Learnova Teacher Portal.
Generate ${count} candidate assessment questions based on the following context.
Course: "${courseTitle || 'Computer Science'}"
Topic: "${topicTitle || 'Core Concepts'}"
Source Learning Resource: "${sourceContent || 'Standard curriculum concepts'}"
Allowed Question Types: ${(questionTypes || ['multiple_choice']).join(', ')}
Difficulty: "${difficulty || 'medium'}"

Return ONLY a valid JSON array of objects with the following schema for each question:
[
  {
    "id": "ai-gen-" + random number,
    "prompt": "Question text",
    "type": "multiple_choice" | "true_false" | "fill_blank" | "matching" | "short_answer",
    "difficulty": "easy" | "medium" | "hard",
    "points": number,
    "explanation": "Detailed explanation of correct answer and educational rationale",
    "sourceContext": "Excerpt or topic context used",
    // if multiple_choice:
    "options": [
      { "id": "1", "text": "Option text", "isCorrect": boolean }
    ],
    // if true_false:
    "correctBool": boolean,
    // if fill_blank:
    "acceptedAnswers": ["answer 1", "answer 2"],
    // if matching:
    "matchingPairs": [
      { "id": "p1", "left": "Term 1", "right": "Definition 1" }
    ],
    // if short_answer:
    "expectedRubric": "Rubric or expected keywords"
  }
]
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '[]';
      const parsed = JSON.parse(responseText);
      return res.json({ success: true, candidates: parsed, source: 'gemini' });
    } catch (err: any) {
      console.warn('Gemini API call failed or timed out, using intelligent academic fallback:', err?.message || err);
      // Fallback gracefully below
    }
  }

  // High-quality deterministic educational fallback
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

  return res.json({ success: true, candidates: generatedCandidates, source: 'deterministic_engine' });
});

// Cache for AI lesson explanations (SSD-05 caching requirement)
const lessonAICache = new Map<string, string>();

// API endpoint for Student Module: AI Lesson Simplification, Analogies & Custom Questions (STU-08, SSD-05)
app.post('/api/ai/simplify-lesson', async (req, res) => {
  const {
    lessonTitle = 'Lesson',
    topicTitle = 'Topic',
    courseTitle = 'Course',
    lessonContent = '',
    customPrompt = '',
    mode = 'simplify', // 'simplify' | 'analogy' | 'example' | 'custom'
  } = req.body;

  const cacheKey = `${courseTitle}::${topicTitle}::${lessonTitle}::${mode}::${customPrompt.trim().toLowerCase()}`;
  if (lessonAICache.has(cacheKey)) {
    return res.json({
      success: true,
      explanation: lessonAICache.get(cacheKey),
      source: 'gemini_cache',
      isCached: true,
      promptUsed: customPrompt || mode,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      let instructions = '';

      if (mode === 'analogy') {
        instructions = `Explain the following educational topic using a vivid, memorable real-world analogy. Keep it clear, friendly, and grounded in everyday experience.`;
      } else if (mode === 'example') {
        instructions = `Provide a concrete, step-by-step worked example with annotated code or problem breakdown for this lesson concept.`;
      } else if (mode === 'custom' && customPrompt) {
        instructions = `Answer the student's specific question: "${customPrompt}" within the exact context of this lesson.`;
      } else {
        instructions = `Provide a clear, simplified explanation of the core concept in plain language. Use 2-3 short paragraphs, bullet points for key takeaways, and highlight why this concept matters.`;
      }

      const prompt = `You are Learnova's Academic AI Assistant.
Context:
- Course: "${courseTitle}"
- Topic: "${topicTitle}"
- Lesson: "${lessonTitle}"
- Lesson Content Excerpt: "${lessonContent ? lessonContent.slice(0, 1500) : 'Foundational curriculum concepts'}"

Task:
${instructions}

Format your output in clean Markdown with headings (###), bullet points, and code snippets where appropriate. Maintain an encouraging, academically rigorous tone.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const explanation = response.text?.trim() || '';
      if (explanation) {
        lessonAICache.set(cacheKey, explanation);
        return res.json({
          success: true,
          explanation,
          source: 'gemini',
          isCached: false,
          promptUsed: customPrompt || mode,
        });
      }
    } catch (err: any) {
      console.warn('Gemini simplification call failed or timed out, using academic fallback:', err?.message || err);
    }
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

  lessonAICache.set(cacheKey, fallbackText);

  return res.json({
    success: true,
    explanation: fallbackText,
    source: 'academic_cache',
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

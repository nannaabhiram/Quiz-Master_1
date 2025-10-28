// server.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const os = require('os');

// Load environment variables explicitly from src/.env, but allow root .env to override if present
const srcEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.resolve(process.cwd(), '.env');
let usedEnv = null;
if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath, override: true });
  usedEnv = rootEnvPath;
} else if (fs.existsSync(srcEnvPath)) {
  require('dotenv').config({ path: srcEnvPath, override: true });
  usedEnv = srcEnvPath;
}
console.log(`[env] Loaded ${usedEnv || 'no .env file found'}; has MONGO_URI: ${!!process.env.MONGO_URI}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render HTTPS
app.set('trust proxy', 1);

// Function to get the local network IP address
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost'; // fallback
}

// Middleware
app.use(express.json());
// Minimal CORS for local dev (adjust as needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing. Please set it in your .env file.');
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas!');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message || err);
  });

// Extra connection diagnostics
mongoose.connection.on('connected', () => console.log('[mongoose] connection state=connected (1)'));
mongoose.connection.on('disconnected', () => console.log('[mongoose] connection state=disconnected (0)'));
mongoose.connection.on('reconnected', () => console.log('[mongoose] connection state=reconnected'));
mongoose.connection.on('error', (e) => console.error('[mongoose] connection error:', e?.message || e));

// Import models
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');

// In-memory participants store: Map<quizId, Map<name, { name, score }>>
const participants = new Map();
// In-memory quiz state: Map<quizId, { currentIndex: number, total: number }>
const quizState = new Map();

function getQuizParticipants(quizId) {
  if (!participants.has(quizId)) participants.set(quizId, new Map());
  return participants.get(quizId);
}

function generateCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState });
});

// New endpoint to get current network IP
app.get('/api/network-info', (req, res) => {
  const networkIP = getNetworkIP();
  res.json({ 
    networkIP, 
    port: PORT,
    apiBase: `http://${networkIP}:${PORT}`,
    frontendUrl: `http://${networkIP}:5173`
  });
});

// Admin route to create a new quiz
app.post('/api/admin/quizzes', async (req, res) => {
  try {
    const { title, questions } = req.body;
    // Basic validation to provide clearer errors
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }
    for (const [idx, q] of questions.entries()) {
      if (!q || typeof q !== 'object') {
        return res.status(400).json({ error: `Question ${idx + 1} is invalid` });
      }
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ error: `Question ${idx + 1}: questionText is required` });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: `Question ${idx + 1}: at least 2 options are required` });
      }
      if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
        return res.status(400).json({ error: `Question ${idx + 1}: correctAnswer must be one of the options` });
      }
    }
    const newQuiz = new Quiz({ title });
    await newQuiz.save();

    // Loop through questions and link them to the quiz
    const questionDocs = await Promise.all(
      (questions || []).map((q) => {
        const newQuestion = new Question({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points || 1000, // Include points from the request or default to 1000
          quizId: newQuiz._id
        });
        return newQuestion.save();
      })
    );

    newQuiz.questions = questionDocs.map((doc) => doc._id);
    await newQuiz.save();

    res.status(201).json(newQuiz);
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: err?.message || 'Failed to create quiz' });
  }
});

// Admin route to 'start' a quiz
app.put('/api/admin/quizzes/:id/start', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (!quiz.code) {
      quiz.code = generateCode();
    }
    // normalize to uppercase for consistent comparison
    quiz.code = String(quiz.code).toUpperCase();
    quiz.status = 'active';
    await quiz.save();
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    // Initialize participant bucket
    getQuizParticipants(String(quiz._id));
    // DON'T initialize quiz state yet - wait for admin to click "Next Question" for first question
    // This allows students to join but not see questions until first question is shown
    const total = await Question.countDocuments({ quizId: quiz._id });
    // Store total but don't start questions yet
    res.json({ _id: quiz._id, title: quiz.title, status: quiz.status, code: quiz.code, total });
  } catch (err) {
    console.error('Start quiz error:', err);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

// Student route to get active quizzes
app.get('/api/student/quizzes', async (req, res) => {
  try {
    const activeQuizzes = await Quiz.find({ status: 'active' }).select('title');
    res.json(activeQuizzes);
  } catch (err) {
    console.error('Fetch active quizzes error:', err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get quiz by id (includes code)
app.get('/api/admin/quizzes/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).select('title status code');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    console.error('Get quiz error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Admin: list participants for a quiz
app.get('/api/admin/quizzes/:id/participants', async (req, res) => {
  try {
    const pid = String(req.params.id);
    const bucket = getQuizParticipants(pid);
    res.json(Array.from(bucket.values()));
  } catch (err) {
    console.error('Get participants error:', err);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Student: join by code
app.post('/api/student/join', async (req, res) => {
  try {
    const { name, code } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
    if (!code || !String(code).trim()) return res.status(400).json({ error: 'code is required' });
    const lookup = String(code).trim().toUpperCase();
    const quiz = await Quiz.findOne({ status: 'active', code: lookup }).select('_id title code');
    if (!quiz) return res.status(404).json({ error: 'Active quiz with this code not found' });
    const bucket = getQuizParticipants(String(quiz._id));
    const playerName = String(name).trim();
    if (!bucket.has(playerName)) bucket.set(playerName, { name: playerName, score: 0 });
    res.json({ quizId: String(quiz._id), title: quiz.title, code: quiz.code });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: 'Failed to join quiz' });
  }
});

// Student: answer submission (increments score if correct with speed bonus)
app.post('/api/student/answer', async (req, res) => {
  try {
    const { quizId, name, answer, timeLeft, correct: legacyCorrect, points: legacyPoints } = req.body || {};
    if (!quizId || !name) return res.status(400).json({ error: 'quizId and name are required' });
    const pid = String(quizId);
    const bucket = getQuizParticipants(pid);
    const player = bucket.get(String(name));
    if (!player) return res.status(404).json({ error: 'Player not joined' });

    // Determine correctness server-side based on current question, falling back to legacy payload if provided
    let isCorrect = false;
    let basePoints = 1000;
    try {
      const state = quizState.get(pid);
      if (state && typeof state.currentIndex === 'number' && state.currentIndex >= 0) {
        const qdocs = await Question.find({ quizId: pid }).sort({ _id: 1 }).skip(state.currentIndex).limit(1).select('options correctAnswer points');
        const q = qdocs[0];
        if (q) {
          basePoints = Number(q.points || 1000);
          if (typeof answer === 'number' && Array.isArray(q.options)) {
            const chosen = q.options[answer];
            isCorrect = chosen === q.correctAnswer;
          }
        }
      }
    } catch (e) {
      // ignore and fall back to legacy payload
    }
    if (!isCorrect && typeof legacyCorrect === 'boolean') {
      isCorrect = legacyCorrect;
    }
    if (legacyPoints && !Number.isNaN(Number(legacyPoints))) {
      basePoints = Number(legacyPoints);
    }

    if (isCorrect) {
      const tl = Number(timeLeft || 0);
      const bounded = Math.max(0, Math.min(20, tl));
      const speedBonus = Math.floor((bounded / 20) * 500);
      const totalPoints = basePoints + speedBonus;
      player.score += totalPoints;
      bucket.set(String(name), player);
      return res.json({ ok: true, score: player.score, correct: true, speedBonus, totalPoints });
    }
    return res.json({ ok: true, score: player.score, correct: false, speedBonus: 0, totalPoints: 0 });
  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Admin: advance to next question (increments currentIndex up to total - 1)
app.put('/api/admin/quizzes/:id/next', async (req, res) => {
  try {
    const pid = String(req.params.id);
    let state = quizState.get(pid);
    if (!state) {
      // First time clicking "Next Question" - start from question 0
      const total = await Question.countDocuments({ quizId: pid });
      state = { currentIndex: 0, total };
      quizState.set(pid, state);
      console.log(`Quiz ${pid} started! First question (index 0) is now active.`);
      res.json({ currentIndex: state.currentIndex, total: state.total });
      return;
    }
    // Subsequent clicks - advance to next question
    const nextIndex = state.currentIndex + 1;
    state.currentIndex = nextIndex;
    quizState.set(pid, state);
    console.log(`Quiz ${pid} advanced to question index ${nextIndex}`);
    res.json({ currentIndex: state.currentIndex, total: state.total });
  } catch (err) {
    console.error('Advance next error:', err);
    res.status(500).json({ error: 'Failed to advance question' });
  }
});

// Student: get current question (based on server quiz state)
app.get('/api/student/quizzes/:id/current-question', async (req, res) => {
  try {
    const pid = String(req.params.id);
    const state = quizState.get(pid);
    if (!state || typeof state.currentIndex !== 'number' || state.currentIndex < 0) {
      return res.status(404).json({ error: 'Quiz not started' });
    }
    const qdocs = await Question.find({ quizId: pid })
      .sort({ _id: 1 })
      .skip(state.currentIndex)
      .limit(1)
      .select('questionText options points');
    const q = qdocs[0];
    if (!q) {
      return res.status(404).json({ error: 'No more questions' });
    }
    return res.json({
      questionText: q.questionText,
      options: q.options || [],
      points: q.points || 1000,
      index: state.currentIndex,
    });
  } catch (err) {
    console.error('current-question error:', err);
    res.status(500).json({ error: 'Failed to fetch current question' });
  }
});

// Student: view quiz state by quiz id
app.get('/api/student/quizzes/:id/state', async (req, res) => {
  try {
    const pid = String(req.params.id);
    let state = quizState.get(pid);
    if (!state) {
      // Quiz hasn't been started yet by admin
      const total = await Question.countDocuments({ quizId: pid });
      res.json({ currentIndex: -1, total: total, started: false });
      return;
    }
    res.json({ currentIndex: state.currentIndex || 0, total: state.total || 0, started: true });
  } catch (err) {
    console.error('Get state error:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

// Student: fetch quiz (and questions) by join code
app.get('/api/student/quiz-by-code', async (req, res) => {
  try {
    const codeRaw = (req.query.code || '').toString().trim().toUpperCase();
    if (!codeRaw) return res.status(400).json({ error: 'code is required' });
    const quiz = await Quiz.findOne({ status: 'active', code: codeRaw }).select('_id title status code');
    if (!quiz) return res.status(404).json({ error: 'Active quiz with this code not found' });

    // Check if the quiz has actually started (has quiz state initialized)
    let state = quizState.get(String(quiz._id));
    const hasStarted = state && typeof state.currentIndex === 'number';
    
    if (!hasStarted) {
      // Quiz exists and is joinable, but questions haven't started yet
      return res.json({
        quiz: { _id: String(quiz._id), title: quiz.title, code: quiz.code },
        questions: [], // No questions until admin starts
        state: { currentIndex: -1, total: 0, started: false }, // -1 indicates not started
      });
    }

    // Get all question data including questionText, options, correctAnswer, and points
    const qdocs = await Question.find({ quizId: quiz._id }).select('questionText options correctAnswer points');
    const questions = qdocs.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      question: q.questionText, // alias for compatibility
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      points: q.points || 1000
    }));
    
    if (!state) {
      state = { currentIndex: 0, total: questions.length };
      quizState.set(String(quiz._id), state);
    }
    res.json({
      quiz: { _id: String(quiz._id), title: quiz.title, code: quiz.code },
      questions,
      state: { currentIndex: state.currentIndex || 0, total: state.total || questions.length, started: true },
    });
  } catch (err) {
    console.error('quiz-by-code error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz by code' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const networkIP = getNetworkIP();
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Network access: http://${networkIP}:${PORT}`);
  console.log(`Production URL: https://peekaboo-lp6y.onrender.com`);
});
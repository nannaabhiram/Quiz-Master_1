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
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Update the CORS middleware section
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://peekaboo-73vd.onrender.com',
    'https://peekaboo-73vd.onrender.com:443'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing. Please set it in your .env file.');
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch((err) => console.error('❌ Error connecting to MongoDB:', err.message || err));

mongoose.connection.on('connected', () => console.log('[mongoose] connected'));
mongoose.connection.on('disconnected', () => console.log('[mongoose] disconnected'));
mongoose.connection.on('reconnected', () => console.log('[mongoose] reconnected'));
mongoose.connection.on('error', (e) => console.error('[mongoose] error:', e?.message || e));

// Import models
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');

// In-memory stores
const participants = new Map();
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

// ======= ROUTES =======

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState });
});

// Network info
app.get('/api/network-info', (req, res) => {
  const networkIP = getNetworkIP();
  res.json({
    networkIP,
    port: PORT,
    apiBase: `http://${networkIP}:${PORT}`,
    frontendUrl: `http://${networkIP}:5173`,
  });
});

// Admin: create a new quiz
app.post('/api/admin/quizzes', async (req, res) => {
  try {
    const { title, questions } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and questions are required' });
    }

    const newQuiz = new Quiz({ title });
    await newQuiz.save();

    const questionDocs = await Promise.all(
      questions.map((q) => {
        const newQuestion = new Question({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points || 1000,
          quizId: newQuiz._id,
        });
        return newQuestion.save();
      })
    );

    newQuiz.questions = questionDocs.map((q) => q._id);
    await newQuiz.save();

    res.status(201).json(newQuiz);
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: err?.message || 'Failed to create quiz' });
  }
});

// Admin: start quiz
app.put('/api/admin/quizzes/:id/start', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    quiz.code = quiz.code || generateCode();
    quiz.code = quiz.code.toUpperCase();
    quiz.status = 'active';
    await quiz.save();

    getQuizParticipants(String(quiz._id));
    const total = await Question.countDocuments({ quizId: quiz._id });

    res.json({ _id: quiz._id, title: quiz.title, status: quiz.status, code: quiz.code, total });
  } catch (err) {
    console.error('Start quiz error:', err);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

// Student: get active quizzes
app.get('/api/student/quizzes', async (req, res) => {
  try {
    const activeQuizzes = await Quiz.find({ status: 'active' }).select('title');
    res.json(activeQuizzes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Student: join quiz
app.post('/api/student/join', async (req, res) => {
  try {
    const { name, code } = req.body || {};
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

    const lookup = String(code).trim().toUpperCase();
    const quiz = await Quiz.findOne({ status: 'active', code: lookup }).select('_id title code');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const bucket = getQuizParticipants(String(quiz._id));
    const playerName = String(name).trim();
    if (!bucket.has(playerName)) bucket.set(playerName, { name: playerName, score: 0 });

    res.json({ quizId: String(quiz._id), title: quiz.title, code: quiz.code });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: 'Failed to join quiz' });
  }
});

// Student: submit answer
app.post('/api/student/answer', async (req, res) => {
  try {
    const { quizId, name, answer, timeLeft } = req.body || {};
    if (!quizId || !name) return res.status(400).json({ error: 'quizId and name are required' });

    const pid = String(quizId);
    const bucket = getQuizParticipants(pid);
    const player = bucket.get(String(name));
    if (!player) return res.status(404).json({ error: 'Player not joined' });

    const state = quizState.get(pid);
    if (!state) return res.status(404).json({ error: 'Quiz not started' });

    const qdocs = await Question.find({ quizId: pid })
      .sort({ _id: 1 })
      .skip(state.currentIndex)
      .limit(1)
      .select('options correctAnswer points');
    const q = qdocs[0];
    if (!q) return res.status(404).json({ error: 'No question found' });

    const chosen = q.options[answer];
    const isCorrect = chosen === q.correctAnswer;
    const basePoints = Number(q.points || 1000);
    const tl = Math.max(0, Math.min(20, Number(timeLeft || 0)));
    const speedBonus = Math.floor((tl / 20) * 500);
    const totalPoints = basePoints + speedBonus;

    if (isCorrect) player.score += totalPoints;
    bucket.set(String(name), player);

    res.json({ ok: true, correct: isCorrect, score: player.score, totalPoints });
  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// API 404 handler - must come BEFORE the catch-all
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all handler for React routes (must be LAST)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error serving React app');
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const networkIP = getNetworkIP();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://${networkIP}:${PORT}`);
  console.log(`🌍 Production URL: https://peekaboo-lp6y.onrender.com`);
});

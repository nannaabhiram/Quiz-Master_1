const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const os = require('os');

// Load environment variables - check both src/.env and root .env
const srcEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env'); // Fixed: Always go up one level from src/
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

// Serve static files from React build directory only if it exists
const distDir = path.join(__dirname, '../client/dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
} else {
  console.warn('[dev] No built frontend found at client/dist — assuming development mode (Vite dev server)');
}

// CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://peekaboo-73vd.onrender.com',
    'https://peekaboo-73vd.onrender.com:443',
    /^http:\/\/192\.168\.1\.\d{1,3}:5173$/, // Allow any IP in 192.168.1.x range on port 5173
    /^http:\/\/192\.168\.1\.8:5173$/, // Your specific IP for good measure
    'http://192.168.1.8:5173' // Also include as string for exact match
  ];
  
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some(allowed => 
    typeof allowed === 'string' 
      ? allowed === origin 
      : allowed.test(origin)
  );
  
  if (isAllowed || !origin) {
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
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain minimum 5 socket connections
  })
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

function getOrCreateQuizState(quizId, totalQuestions = 0) {
  if (!quizState.has(quizId)) {
    quizState.set(quizId, {
      started: false,
      currentIndex: -1,
      totalQuestions: totalQuestions,
      participants: new Map() // Add participants Map here
    });
  }
  return quizState.get(quizId);
}

function generateCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ======= ROUTES =======

// Health check with database test
app.get('/health', async (req, res) => {
  try {
    // Test database connection by performing a simple operation
    const dbState = mongoose.connection.readyState;
    let dbTest = 'unknown';
    
    if (dbState === 1) { // Connected
      try {
        // Simple ping to test if database operations work
        await mongoose.connection.db.admin().ping();
        dbTest = 'ok';
      } catch (err) {
        dbTest = 'error: ' + err.message;
      }
    }
    
    res.json({ 
      status: 'ok', 
      db: dbState,
      dbTest: dbTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Network info
app.get('/api/network-info', (req, res) => {
  const networkIP = getNetworkIP();
  res.json({
    networkIP,
    port: PORT,
    bapiBase: `http://${networkIP}:${PORT}`,
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

    // Add timeout to mongoose operations
    const timeoutMs = 8000; // 8 seconds timeout
    
    const newQuiz = new Quiz({ title });
    await Promise.race([
      newQuiz.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Quiz save timeout')), timeoutMs)
      )
    ]);

    const questionDocs = await Promise.race([
      Promise.all(
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
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Questions save timeout')), timeoutMs)
      )
    ]);

    newQuiz.questions = questionDocs.map((q) => q._id);
    await Promise.race([
      newQuiz.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Quiz update timeout')), timeoutMs)
      )
    ]);

    res.status(201).json(newQuiz);
  } catch (err) {
    console.error('Create quiz error:', err);
    if (err.message.includes('timeout')) {
      res.status(408).json({ error: 'Database operation timed out. Please try again.' });
    } else {
      res.status(500).json({ error: err?.message || 'Failed to create quiz' });
    }
  }
});

// Admin: start quiz
app.put('/api/admin/quizzes/:id/start', async (req, res) => {
  try {
    console.log('Starting quiz with ID:', req.params.id);
    
    // Find the quiz
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      console.error('Quiz not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    console.log('Found quiz:', { id: quiz._id, title: quiz.title });

    // Get total questions for this quiz
    const totalQuestions = await Question.countDocuments({ quizId: quiz._id });
    console.log('Total questions found:', totalQuestions);
    
    if (totalQuestions === 0) {
      const errorMsg = 'Cannot start quiz with no questions';
      console.error(errorMsg);
      return res.status(400).json({ error: errorMsg });
    }

    try {
      // Initialize quiz state - started but no question shown yet
      const state = getOrCreateQuizState(String(quiz._id), totalQuestions);
      state.started = true;
      state.currentIndex = -1; // -1 means waiting for host to show first question
      state.timeLeft = 20; // Default time per question
      console.log('Quiz state initialized:', state);

      // Generate quiz code if not exists
      quiz.code = quiz.code || generateCode();
      quiz.code = quiz.code.toUpperCase();
      quiz.status = 'active';
      
      console.log('Saving quiz with:', { 
        code: quiz.code, 
        status: quiz.status 
      });
      
      await quiz.save();
      console.log('Quiz saved successfully');

      // Notify all connected clients that the quiz has started
      if (io) {
        const emitData = { 
          quizId: String(quiz._id),
          currentIndex: 0,
          totalQuestions
        };
        console.log('Emitting quizStarted event:', emitData);
        io.emit('quizStarted', emitData);
      }

      const response = { 
        _id: quiz._id, 
        title: quiz.title, 
        status: quiz.status, 
        code: quiz.code, 
        total: totalQuestions 
      };
      
      console.log('Quiz started successfully:', response);
      res.json(response);
      
    } catch (saveError) {
      console.error('Error during quiz start (save/notify):', saveError);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to start quiz', 
          details: saveError.message 
        });
      }
    }
  } catch (err) {
    console.error('Unexpected error in /start endpoint:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to start quiz', 
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
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

    const quizId = String(quiz._id);
    
    // Get or create quiz state, but DON'T mark as started (only admin start does that)
    let state = quizState.get(quizId);
    if (!state) {
      // Create state with started = false (waiting for admin to start)
      state = {
        started: false,
        currentIndex: -1,
        totalQuestions: 0,
        participants: new Map()
      };
      quizState.set(quizId, state);
    }
    
    const playerName = String(name).trim();
    
    // Add player to participants if not already joined
    if (!state.participants.has(playerName)) {
      state.participants.set(playerName, { name: playerName, score: 0, answers: [] });
      console.log(`Player "${playerName}" joined quiz ${quizId}`);
    }

    res.json({ 
      quizId: quizId, 
      title: quiz.title, 
      code: quiz.code,
      totalQuestions: state.totalQuestions
    });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: 'Failed to join quiz' });
  }
});

// Student: get quiz state
app.get('/api/student/quizzes/:id/state', async (req, res) => {
  try {
    const quizId = req.params.id;
    const state = quizState.get(quizId);
    
    if (!state) {
      return res.status(404).json({ error: 'Quiz not found or not started' });
    }

    res.json({
      started: state.started,
      currentIndex: state.currentIndex,
      totalQuestions: state.totalQuestions,
      timeLeft: state.timeLeft || 20
    });
  } catch (err) {
    console.error('Error getting quiz state:', err);
    res.status(500).json({ error: 'Failed to get quiz state' });
  }
});

// Student: get current question
app.get('/api/student/quizzes/:id/current-question', async (req, res) => {
  try {
    const quizId = req.params.id;
    const state = quizState.get(quizId);
    
    if (!state || !state.started) {
      return res.status(404).json({ error: 'Quiz not found or not started' });
    }

    const questions = await Question.find({ quizId })
      .sort('_id')
      .skip(state.currentIndex)
      .limit(1)
      .select('questionText options points');
    
    if (!questions.length) {
      return res.status(404).json({ error: 'No more questions' });
    }

    const question = questions[0].toObject();
    
    // Don't send correct answer to client
    delete question.correctAnswer;

    res.json({
      ...question,
      questionIndex: state.currentIndex,
      totalQuestions: state.totalQuestions,
      timeLeft: state.timeLeft || 20
    });
  } catch (err) {
    console.error('Error getting current question:', err);
    res.status(500).json({ error: 'Failed to get current question' });
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

// Admin: get quiz participants
app.get('/api/admin/quizzes/:id/participants', async (req, res) => {
  try {
    const quizId = String(req.params.id);
    // Get participants from quiz state instead of old participants Map
    const state = quizState.get(quizId);
    if (!state || !state.participants) {
      return res.json([]);
    }
    const playersList = Array.from(state.participants.values());
    res.json(playersList);
  } catch (err) {
    console.error('Get participants error:', err);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Admin: advance to next question
app.put('/api/admin/quizzes/:id/next', async (req, res) => {
  try {
    const quizId = String(req.params.id);
    let state = quizState.get(quizId);
    
    if (!state) {
      // Initialize state if not exists
      state = { started: true, currentIndex: 0 };
      quizState.set(quizId, state);
    } else {
      // Advance to next question
      state.currentIndex += 1;
      state.started = true;
    }
    
    res.json({ ok: true, currentIndex: state.currentIndex });
  } catch (err) {
    console.error('Next question error:', err);
    res.status(500).json({ error: 'Failed to advance question' });
  }
});

// Student: get quiz state
app.get('/api/student/quizzes/:id/state', async (req, res) => {
  try {
    const quizId = String(req.params.id);
    const state = quizState.get(quizId) || { started: false, currentIndex: -1 };
    res.json(state);
  } catch (err) {
    console.error('Get quiz state error:', err);
    res.status(500).json({ error: 'Failed to get quiz state' });
  }
});

// Student: get quiz by code
app.get('/api/student/quiz-by-code', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code is required' });

    const lookup = String(code).trim().toUpperCase();
    const quiz = await Quiz.findOne({ code: lookup }).populate('questions');
    
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Get questions with full details
    const questions = await Question.find({ quizId: quiz._id }).select('questionText options correctAnswer points');
    
    res.json({
      quizId: String(quiz._id),
      title: quiz.title,
      code: quiz.code,
      questions: questions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points
      }))
    });
  } catch (err) {
    console.error('Get quiz by code error:', err);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});


// ✅ FIXED: 404 handler for API routes (regex version — no path-to-regexp error)
app.all(/^\/api\/.*/, (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ✅ Serve React app for all non-API routes using middleware (avoids path-to-regexp)
app.use((req, res, next) => {
  // Skip if this is an API route (already handled above)
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Prefer serving a built React app if present
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving React app:', err);
        return res.status(500).json({ error: 'Error serving frontend application' });
      }
    });
  }

  // If the built client is not present, assume developer is running Vite dev server
  // Redirect the browser to the dev server so client-side routing still works.
  const devServerUrl = `http://localhost:5173${req.originalUrl}`;
  console.warn(`[dev] client/dist not found; redirecting to dev server: ${devServerUrl}`);
  return res.redirect(devServerUrl);
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);

// Re-use same allowed origins as the CORS middleware
const socketAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://peekaboo-73vd.onrender.com',
  'https://peekaboo-73vd.onrender.com:443'
];

const io = socketIO(server, {
  cors: {
    origin: socketAllowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }
});

// Make io accessible via app if other modules need it
app.set('io', io);

io.on('connection', (socket) => {
  console.log('[io] client connected', socket.id);
  // Allow clients to join a quiz-specific room
  socket.on('joinQuiz', (quizId) => {
    try {
      const room = `quiz-${String(quizId)}`;
      socket.join(room);
      console.log(`[io] socket ${socket.id} joined room ${room}`);
    } catch (e) {
      console.error('[io] joinQuiz error', e?.message || e);
    }
  });

  // Allow clients to leave a quiz room
  socket.on('leaveQuiz', (quizId) => {
    try {
      const room = `quiz-${String(quizId)}`;
      socket.leave(room);
      console.log(`[io] socket ${socket.id} left room ${room}`);
    } catch (e) {
      console.error('[io] leaveQuiz error', e?.message || e);
    }
  });

  socket.on('disconnect', (reason) => console.log('[io] disconnected', socket.id, reason));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const networkIP = getNetworkIP();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://${networkIP}:${PORT}`);
  console.log(`🌍 Production URL: https://peekaboo-lp6y.onrender.com`);
});

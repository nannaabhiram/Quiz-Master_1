require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const mongoose = require('mongoose');
const path = require('path');

// Load models
const Quiz = require(path.join(__dirname, '..', 'models', 'Quiz.js'));
const Question = require(path.join(__dirname, '..', 'models', 'Question.js'));

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/quizmaster';
  console.log('[seed] Connecting to', uri);
  await mongoose.connect(uri);
  console.log('[seed] Connected');

  try {
    const title = 'Sample Quiz – General Knowledge';
    let quiz = await Quiz.findOne({ title });
    if (!quiz) {
      quiz = new Quiz({ title, status: 'inactive' });
      await quiz.save();
      console.log('[seed] Created quiz:', quiz._id.toString());
    } else {
      console.log('[seed] Quiz already exists:', quiz._id.toString());
    }

    const existingQs = await Question.find({ quizId: quiz._id });
    if (existingQs.length === 0) {
      const qs = [
        {
          questionText: 'What is the capital of France?',
          options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
          correctAnswer: 'Paris',
          points: 1000,
        },
        {
          questionText: '2 + 2 = ?',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          points: 1000,
        },
        {
          questionText: 'Who wrote Hamlet?',
          options: ['Tolstoy', 'Shakespeare', 'Homer', 'Dante'],
          correctAnswer: 'Shakespeare',
          points: 1000,
        },
        {
          questionText: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
          correctAnswer: 'Mars',
          points: 1000,
        },
      ];

      const saved = await Question.insertMany(
        qs.map((q) => ({ ...q, quizId: quiz._id }))
      );
      quiz.questions = saved.map((q) => q._id);
      await quiz.save();
      console.log(`[seed] Inserted ${saved.length} questions`);
    } else {
      console.log(`[seed] Quiz already has ${existingQs.length} questions`);
    }
  } catch (e) {
    console.error('[seed] Error:', e?.message || e);
  } finally {
    await mongoose.disconnect();
    console.log('[seed] Done.');
  }
}

run();

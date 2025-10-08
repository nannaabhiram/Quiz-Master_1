const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkQuestions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Question = require('../models/Question');
    
    // Get a sample of questions
    const sampleQuestions = await Question.find().limit(5);
    console.log('Sample questions:');
    console.log(JSON.stringify(sampleQuestions, null, 2));
    
    // Count questions with and without points
    const withPoints = await Question.countDocuments({ points: { $exists: true } });
    const withoutPoints = await Question.countDocuments({ points: { $exists: false } });
    
    console.log(`\nQuestions with points: ${withPoints}`);
    console.log(`Questions without points: ${withoutPoints}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking questions:', error);
    process.exit(1);
  }
}

checkQuestions();

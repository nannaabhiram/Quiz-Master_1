const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Question = require('../models/Question');
    
    // Update all questions to have the points field if it doesn't exist
    const result = await Question.updateMany(
      { points: { $exists: false } }, // Find questions without points
      { $set: { points: 1000 } }      // Set default points to 1000
    );

    console.log(`Updated ${result.modifiedCount} questions with default points`);
    
    // Verify the update
    const questionsWithoutPoints = await Question.countDocuments({ points: { $exists: false } });
    console.log(`Questions still without points: ${questionsWithoutPoints}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

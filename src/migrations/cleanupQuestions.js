const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Drop the questions collection
    await mongoose.connection.db.dropCollection('questions');
    console.log('Dropped questions collection');
    
    // Recreate the collection with the correct schema
    await mongoose.connection.db.createCollection('questions');
    console.log('Recreated questions collection with updated schema');
    
    // Update any quizzes to remove references to deleted questions
    const quiz = require('../models/quiz');
    await quiz.updateMany({}, { $set: { questions: [] } });
    console.log('Cleared question references from quizzes');
    
    console.log('\n✅ Cleanup complete! You can now restart your server.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();

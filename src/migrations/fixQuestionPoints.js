const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixQuestionPoints() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the Question model
    const Question = require('../models/Question');
    
    // First, let's find all questions
    const questions = await Question.find({});
    console.log(`Found ${questions.length} questions`);
    
    // Update each question to ensure it has the points field
    let updatedCount = 0;
    const bulkOps = [];
    
    for (const question of questions) {
      // If points doesn't exist or is not a number, set it to 1000
      if (typeof question.points !== 'number' || isNaN(question.points)) {
        bulkOps.push({
          updateOne: {
            filter: { _id: question._id },
            update: { $set: { points: 1000 } }
          }
        });
        updatedCount++;
      }
    }
    
    // Execute bulk operations if there are any updates
    if (bulkOps.length > 0) {
      console.log(`Updating ${bulkOps.length} questions...`);
      await Question.bulkWrite(bulkOps);
      console.log(`Updated ${updatedCount} questions with default points`);
    } else {
      console.log('No questions need to be updated');
    }
    
    // Verify the update
    const invalidPointsCount = await Question.countDocuments({
      $or: [
        { points: { $exists: false } },
        { points: { $not: { $type: 'number' } } },
        { points: { $lt: 0 } }
      ]
    });
    
    console.log(`Questions with invalid points after update: ${invalidPointsCount}`);
    
    // Show a sample of updated questions
    const sampleQuestions = await Question.find().limit(3);
    console.log('\nSample questions after update:');
    console.log(sampleQuestions.map(q => ({
      _id: q._id,
      questionText: q.questionText?.substring(0, 30) + (q.questionText?.length > 30 ? '...' : ''),
      points: q.points,
      hasPoints: q.points !== undefined
    })));
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixQuestionPoints();

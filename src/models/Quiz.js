const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  code: {
    type: String,
    index: true,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active'],
    default: 'draft'
  },
  // To store an array of question IDs
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }]
});

module.exports = mongoose.model('Quiz', quizSchema);
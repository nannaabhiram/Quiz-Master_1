import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Square, Users, Trophy, Clock, Edit3 } from 'lucide-react';
import { useQuiz } from './QuizContext';
import TextToImage from './TextToImage';
import QRCode from 'qrcode';

// Admin Panel Component
const AdminPanel = ({ onBack }) => {
  const { 
    quizState, 
    setQuizState,
    startQuiz,
    actuallyStartQuiz, // Add this function from context
    nextQuestion: nextQuestionContext, 
    endQuiz: endQuizContext, 
    resetQuiz: resetQuizContext,
  } = useQuiz();

  const questions = quizState.questions;
  
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    points: 1000
  });
  const [editingIndex, setEditingIndex] = useState(-1);

  // Use quiz state from context
  const { isActive: quizActive, currentQuestion, showResults, students, quizCode } = quizState;

  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (quizActive) {
      // Use your computer's actual IP address
      const computerIP = '192.168.0.9'; // Your actual IP from ifconfig
      const joinUrl = `http://${computerIP}:3000?join=${quizCode}`;
      QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('QR Code generation failed:', err);
      });
    }
  }, [quizActive, quizCode]);

  const addQuestion = () => {
    if (newQuestion.question.trim() && newQuestion.options.every(opt => opt.trim())) {
      let updatedQuestions;
      if (editingIndex >= 0) {
        updatedQuestions = [...questions];
        updatedQuestions[editingIndex] = { ...newQuestion };
      } else {
        updatedQuestions = [...questions, { ...newQuestion }];
      }
      setQuizState(prev => ({ ...prev, questions: updatedQuestions }));
      setEditingIndex(-1);
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        points: 1000
      });
    }
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuizState(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const editQuestion = (index) => {
    setNewQuestion({ ...questions[index] });
    setEditingIndex(index);
  };

  const handleStartQuiz = () => {
    if (questions.length > 0) {
      startQuiz(questions); // This sets up the quiz for students to join
    }
  };

  const handleNextQuestion = () => {
    // If quiz is active but not started, start it
    if (quizActive && !quizState.isStarted) {
      console.log('Actually starting the quiz now');
      actuallyStartQuiz(); // Use the context function instead of setQuizState
    } 
    // If quiz is started and not on last question, go to next
    else if (quizState.isStarted && currentQuestion < questions.length - 1) {
      nextQuestionContext();
    } 
    // If on last question, end quiz
    else {
      handleStopQuiz();
    }
  };

  const handleStopQuiz = () => {
    endQuizContext();
  };

  const updateQuestionField = (field, value) => {
    setNewQuestion({ ...newQuestion, [field]: value });
  };

  const updateOption = (index, value) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const resetToHome = () => {
    setQuizState(prev => ({ ...prev, showResults: false, students: [] }));
    resetQuizContext();
    onBack();
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Quiz Results</h1>
              <p className="text-xl text-gray-600">Final Leaderboard</p>
            </div>

            <div className="max-w-2xl mx-auto">
              {students.length > 0 && (
                <>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-6 text-center text-white">
                    <Trophy size={48} className="mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-2">🏆 Winner 🏆</h2>
                    <div className="text-2xl font-bold">{students[0].name}</div>
                    <div className="text-xl">{students[0].score.toLocaleString()} points</div>
                  </div>
                  <div className="space-y-4">
                    {students.slice(1).map((student, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700 mr-4">
                            {index + 2}
                          </div>
                          <div className="font-semibold text-gray-800">{student.name}</div>
                        </div>
                        <div className="font-bold text-blue-600">{student.score.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="text-center mt-8 space-x-4">
              <button
                onClick={() => {
                  setQuizState(prev => ({ ...prev, showResults: false, students: [] }));
                  resetQuizContext();
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-xl text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              >
                Create New Quiz
              </button>
              <button
                onClick={resetToHome}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 px-8 rounded-xl text-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizActive) {
    const questionsFromContext = quizState.questions;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Quiz Active</h2>
                <p className="text-gray-600">Question {currentQuestion + 1} of {questionsFromContext.length}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <button
                  onClick={handleNextQuestion}
                  className="bg-green-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-600 transition-all duration-300"
                >
                  {!quizState.isStarted ? 'Start Quiz' : 
                   currentQuestion < questionsFromContext.length - 1 ? 'Next Question' : 'End Quiz'}
                </button>
                <button
                  onClick={handleStopQuiz}
                  className="bg-red-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-600 transition-all duration-300 flex items-center"
                >
                  <Square className="mr-2" size={20} />
                  Stop Quiz
                </button>
                <button
                  onClick={resetToHome}
                  className="bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all duration-300"
                >
                  Home
                </button>
              </div>
            </div>
          </div>

          {/* Updated Quiz Code Display Section with QR Code */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-xl p-6 mb-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Students Join Quiz</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code Section */}
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4">
                <h4 className="text-lg font-bold text-white mb-3">Scan QR Code</h4>
                {qrCodeUrl && (
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCodeUrl} alt="Quiz QR Code" className="w-32 h-32 mx-auto" />
                  </div>
                )}
                <p className="text-white text-sm mt-2">Scan with mobile device</p>
              </div>

              {/* Manual Code Section */}
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4">
                <h4 className="text-lg font-bold text-white mb-3">Manual Entry</h4>
                <div className="text-4xl font-bold text-white tracking-wider mb-2">{quizCode}</div>
                <p className="text-white text-sm">Enter this code manually</p>
              </div>
            </div>

            <div className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white text-sm">
                📱 Students visit: <span className="font-bold">192.168.0.9:3000</span>
              </p>
              <p className="text-white text-xs mt-1 opacity-80">
                Then scan QR code or enter code: <span className="font-bold">{quizCode}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Current Question</h3>
              <div className="bg-blue-50 rounded-xl p-6">
                {/* Show question as image */}
                <div className="mb-4">
                  <TextToImage
                    text={questionsFromContext[currentQuestion]?.question}
                    width={500}
                    height={100}
                    fontSize={20}
                    className="mx-auto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {questionsFromContext[currentQuestion]?.options.map((option, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg font-medium ${
                        index === questionsFromContext[currentQuestion].correct
                          ? 'bg-green-100 text-green-800 border-2 border-green-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}: {option}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Live Leaderboard</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {students.map((student, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0
                        ? 'bg-yellow-100 border-2 border-yellow-300'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                        index === 0
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                    <span className="font-bold text-blue-600">{student.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">Quiz Admin Panel</h1>
              <p className="text-xl text-gray-600">Create and manage your quiz questions</p>
            </div>
            <button
              onClick={onBack}
              className="bg-gray-500 text-white font-bold py-2 px-6 rounded-xl hover:bg-gray-600 transition-all duration-300"
            >
              Back to Home
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingIndex >= 0 ? 'Edit Question' : 'Add New Question'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                <textarea
                  value={newQuestion.question}
                  onChange={(e) => updateQuestionField('question', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Enter your question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={newQuestion.correct === index}
                      onChange={() => updateQuestionField('correct', index)}
                      className="mr-3"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input
                  type="number"
                  value={newQuestion.points}
                  onChange={(e) => updateQuestionField('points', parseInt(e.target.value) || 1000)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="100"
                  max="5000"
                />
              </div>

              <button
                onClick={addQuestion}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center"
              >
                <Plus className="mr-2" size={20} />
                {editingIndex >= 0 ? 'Update Question' : 'Add Question'}
              </button>

              {editingIndex >= 0 && (
                <button
                  onClick={() => {
                    setEditingIndex(-1);
                    setNewQuestion({
                      question: '',
                      options: ['', '', '', ''],
                      correct: 0,
                      points: 1000
                    });
                  }}
                  className="w-full bg-gray-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">
                    {questions.reduce((sum, q) => sum + q.points, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{questions.length * 20}s</div>
                  <div className="text-sm text-gray-600">Est. Time</div>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                disabled={questions.length === 0}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Play className="mr-2" size={24} />
                Start Quiz ({questions.length} questions)
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Questions ({questions.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((q, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800 flex-1 mr-4">{q.question}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editQuestion(index)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Correct: {String.fromCharCode(65 + q.correct)} - {q.options[q.correct]} ({q.points} pts)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
import React, { useState, useEffect } from 'react';
import { Play, Trophy, Clock, Smartphone, Wifi, User } from 'lucide-react';
import { useQuiz } from './QuizContext';
import TextToImage from './TextToImage';
import ScreenshotProtection from './ScreenshotProtection';

// Student Quiz App Component
const StudentQuizApp = ({ onBack }) => {
  const { 
    quizState, 
    joinQuiz, 
    submitAnswer, 
    students 
  } = useQuiz();
  
  const [gameState, setGameState] = useState('waiting');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [quizCode, setQuizCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [finalRank, setFinalRank] = useState(0);
  const [studentId, setStudentId] = useState(null);

  // Get quiz data from context
  const { isActive: quizActive, isStarted: quizStarted, currentQuestion, questions, showResults } = quizState;

  // Check for QR code join parameter on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      setQuizCode(joinCode.toUpperCase()); // Auto-fill quiz code and convert to uppercase
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Add cross-tab communication
  useEffect(() => {
    const handleQuizStarted = (e) => {
      console.log('Quiz started event received:', e.detail);
      if (gameState === 'ready') {
        setGameState('playing');
        setTimeLeft(20);
        setSelectedAnswer(null);
        setShowResult(false);
      }
    };

    const handleQuestionChanged = (e) => {
      console.log('Question changed event received:', e.detail);
      if (gameState === 'playing') {
        setTimeLeft(20);
        setSelectedAnswer(null);
        setShowResult(false);
      }
    };

    // Listen for custom events
    window.addEventListener('quizStarted', handleQuizStarted);
    window.addEventListener('questionChanged', handleQuestionChanged);

    return () => {
      window.removeEventListener('quizStarted', handleQuizStarted);
      window.removeEventListener('questionChanged', handleQuestionChanged);
    };
  }, [gameState]);

  // Fix the quiz start detection logic
  useEffect(() => {
    console.log('Quiz state check:', { 
      gameState, 
      quizActive, 
      quizStarted,
      questionsLength: questions.length,
      currentQuestion 
    });
    
    // Check if quiz is started and has questions
    if (quizActive && quizStarted && questions.length > 0 && gameState === 'ready') {
      console.log('Starting quiz - transitioning to playing state');
      setGameState('playing');
      setTimeLeft(20);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }, [quizActive, quizStarted, gameState, questions.length]);

  // Update this useEffect to properly listen for admin question changes
  useEffect(() => {
    if (gameState === 'playing' && quizActive && quizStarted) {
      // Reset for new question
      setTimeLeft(20);
      setSelectedAnswer(null);
      setShowResult(false);
      
      // Check if quiz ended
      if (currentQuestion >= questions.length) {
        setFinalRank(Math.floor(Math.random() * 10) + 1);
        setGameState('finished');
      }
    }
  }, [currentQuestion, gameState, quizActive, quizStarted, questions.length]);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0 && !showResult) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !showResult && gameState === 'playing') {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, showResult]);

  const handleJoinQuiz = () => {
    if (playerName.trim() && quizCode.trim()) {
      // Call context joinQuiz function and get student ID
      const newStudentId = Date.now();
      setStudentId(newStudentId); // Store student ID
      const success = joinQuiz(playerName, quizCode, newStudentId); // Pass student ID
      if (success) {
        setIsConnected(true);
        setGameState('ready');
      } else {
        alert('Invalid quiz code or quiz not active!');
      }
    }
  };

  const handleTimeUp = () => {
    setShowResult(true);
    // Don't auto-advance - wait for admin
  };

  const handleAnswerClick = (answerIndex) => {
    if (selectedAnswer !== null || showResult) return;
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    if (answerIndex === questions[currentQuestion].correct) {
      const timeBonus = Math.floor((timeLeft / 20) * 500);
      const points = questions[currentQuestion].points + timeBonus;
      setScore(score + points);
      
      // Submit answer to context for scoring with correct student ID
      submitAnswer(studentId, answerIndex, timeLeft);
    } else {
      // Still submit answer even if wrong
      submitAnswer(studentId, answerIndex, timeLeft);
    }
  };

  const resetQuiz = () => {
    setGameState('waiting');
    setScore(0);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setShowResult(false);
    setPlayerName('');
    setQuizCode('');
    setIsConnected(false);
  };

  const getAnswerClass = (index) => {
    const baseClass = "w-full p-4 rounded-2xl font-bold text-lg transition-all duration-300 transform active:scale-95";
    
    if (!showResult) {
      if (selectedAnswer === index) {
        return `${baseClass} bg-blue-500 text-white scale-105 shadow-lg`;
      }
      return `${baseClass} bg-white text-gray-800 shadow-md hover:shadow-lg hover:scale-102`;
    }
    
    if (index === questions[currentQuestion].correct) {
      return `${baseClass} bg-green-500 text-white shadow-lg`;
    }
    
    if (selectedAnswer === index && index !== questions[currentQuestion].correct) {
      return `${baseClass} bg-red-500 text-white shadow-lg`;
    }
    
    return `${baseClass} bg-gray-300 text-gray-600`;
  };

  const handleScreenshotDetected = () => {
    // End quiz session for this student
    alert('Multiple screenshot attempts detected. Quiz session ended.');
    resetQuiz();
    onBack();
  };

  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 mb-6 text-center">
            <Smartphone className="mx-auto text-white mb-2" size={48} />
            <h1 className="text-2xl font-bold text-white">Mobile Quiz</h1>
            <p className="text-white opacity-90 text-sm">Join the quiz session</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Quiz</h2>
              <p className="text-gray-600">Enter your details to participate</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Code</label>
                <input
                  type="text"
                  placeholder="Enter quiz code"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  className="w-full p-4 border-2 border-gray-300 rounded-xl text-lg font-semibold text-center focus:border-blue-500 focus:outline-none"
                  maxLength="6"
                />
                {quizCode && (
                  <p className="text-sm text-green-600 mt-1 text-center">
                    ✓ Quiz code entered
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-4 border-2 border-gray-300 rounded-xl text-lg font-semibold text-center focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            
            <button
              onClick={handleJoinQuiz}
              disabled={!playerName.trim() || !quizCode.trim()}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Wifi className="mr-2" size={24} />
              Join Quiz
            </button>

            <button
              onClick={onBack}
              className="w-full mt-4 bg-gray-500 text-white font-bold py-3 px-6 rounded-xl text-lg hover:bg-gray-600 transition-all duration-300"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-green-600" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">You're In!</h2>
              <p className="text-gray-600">Connected successfully</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="font-bold text-lg text-gray-800">{playerName}</div>
                  <div className="text-sm text-gray-600">Your Name</div>
                </div>
                <div>
                  <div className="font-bold text-lg text-blue-600">{quizCode}</div>
                  <div className="text-sm text-gray-600">Quiz Code</div>
                </div>
              </div>
            </div>
            
            <div className="animate-pulse">
              <Clock className="mx-auto text-blue-500 mb-4" size={48} />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Waiting for Quiz to Start...</h3>
              <p className="text-gray-600">The instructor will start the quiz shortly</p>
            </div>
            
            <div className="flex justify-center mt-6">
              <div className="flex space-x-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                resetQuiz();
                onBack();
              }}
              className="w-full mt-6 bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all duration-300"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const maxScore = questions.length * 1500;
    const percentage = Math.round((score / maxScore) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
            <p className="text-xl text-gray-600 mb-4">Great job, {playerName}!</p>
            
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 mb-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">{score.toLocaleString()}</div>
              <div className="text-gray-600 mb-2">Your Score</div>
              <div className="text-lg font-semibold text-blue-600">#{finalRank} Position</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <div className="font-bold text-2xl text-green-600">{percentage}%</div>
                <div className="text-sm text-green-700">Accuracy</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl text-center">
                <div className="font-bold text-2xl text-blue-600">{questions.length}</div>
                <div className="text-sm text-blue-700">Questions</div>
              </div>
            </div>
            
            <div className="text-center text-gray-600 mb-6">
              <p>🎉 Thanks for participating! 🎉</p>
              <p className="text-sm mt-2">Results will be shared by your instructor</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={resetQuiz}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-4 px-6 rounded-xl text-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center"
              >
                <Play className="mr-2" size={24} />
                Join Another Quiz
              </button>
              
              <button
                onClick={() => {
                  resetQuiz();
                  onBack();
                }}
                className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all duration-300"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!questions[currentQuestion]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
        <div className="text-white text-2xl font-bold">
          Waiting for quiz to start...
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <ScreenshotProtection onScreenshotDetected={handleScreenshotDetected}>
        <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 p-4">
          <div className="mb-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center text-white">
              <div className="text-center">
                <div className="text-xl font-bold">{score.toLocaleString()}</div>
                <div className="text-xs opacity-90">Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-semibold">Q{currentQuestion + 1}/{questions.length}</div>
                <div className="text-xs opacity-90">Question</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold">{timeLeft}</div>
                <div className="text-xs opacity-90">Time</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-white bg-opacity-30 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              />
            </div>
          </div>

          {/* Replace text question with image */}
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
              <TextToImage
                text={questions[currentQuestion].question}
                width={600}
                height={120}
                fontSize={28}
                className="mx-auto"
              />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(index)}
                disabled={showResult}
                className={getAnswerClass(index)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-4 text-gray-800 font-bold text-sm">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-left">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {showResult && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4">
                {selectedAnswer === questions[currentQuestion].correct ? (
                  <>
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Correct!</h3>
                    <p className="text-gray-600">Great job! +{questions[currentQuestion].points + Math.floor((timeLeft / 20) * 500)} points</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">😔</div>
                    <h3 className="text-2xl font-bold text-red-600 mb-2">Wrong Answer</h3>
                    <div className="text-gray-600">
                      <p className="mb-2">The correct answer was:</p>
                      <p className="font-semibold">{questions[currentQuestion].options[questions[currentQuestion].correct]}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </ScreenshotProtection>
    );
  }

  return null;
};

export default StudentQuizApp;
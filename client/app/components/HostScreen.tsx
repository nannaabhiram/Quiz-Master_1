/* @ts-nocheck */
import React, { useState, useEffect, useRef } from 'react';
import { Users, Play, Square, Trophy, Clock, Tv, ChevronRight } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getApiBase } from '../utils/api-config';
import { getSocket } from '../utils/socket';
import QRCode from 'qrcode';

const HostScreen: React.FC = () => {
  const [apiBase, setApiBase] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizCode, setQuizCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'question' | 'answers' | 'leaderboard' | 'finished'>('waiting');
  const [timeLeft, setTimeLeft] = useState(20);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  // Initialize API base
  useEffect(() => {
    const initApi = async () => {
      const base = await getApiBase();
      setApiBase(base);
    };
    initApi();
  }, []);

  // Generate QR code for student join URL
  useEffect(() => {
    const generateQRCode = async () => {
      if (quizCode && typeof window !== 'undefined') {
        try {
          // Create student join URL with quiz code
          const studentJoinUrl = `${window.location.origin}/student?code=${quizCode}`;
          
          // Generate QR code
          const qrDataUrl = await QRCode.toDataURL(studentJoinUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#1a202c',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          
          setQrCodeUrl(qrDataUrl);
          console.log('QR Code generated for:', studentJoinUrl);
        } catch (error) {
          console.error('Failed to generate QR code:', error);
        }
      }
    };
    
    generateQRCode();
  }, [quizCode]);

  // Get quiz ID from URL params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizIdFromUrl = urlParams.get('quizId');
    const codeFromUrl = urlParams.get('code');
    
    if (quizIdFromUrl) {
      setQuizId(quizIdFromUrl);
      
      // Load quiz questions
      const loadQuestions = async () => {
        if (!apiBase) return; // wait for API base to be ready
        try {
          const res = await fetch(`${apiBase}/api/student/quiz-by-code?code=${codeFromUrl}`);
          if (res.ok) {
            const data = await res.json();
            if (data.questions) {
              // Normalize questions so rendering always has {question, options, correct}
              const normalized = data.questions.map((q: any) => ({
                question: q.questionText || q.question,
                options: Array.isArray(q.options) ? q.options : [],
                correct: Array.isArray(q.options)
                  ? Math.max(0, q.options.indexOf(q.correctAnswer))
                  : (typeof q.correct === 'number' ? q.correct : 0),
              }));
              setQuestions(normalized);
            }
          }
        } catch (error) {
          console.error('Error loading questions:', error);
        }
      };
      
      if (codeFromUrl) {
        loadQuestions();
      }
    }
    if (codeFromUrl) {
      setQuizCode(codeFromUrl);
    }
  }, [apiBase]);

  // create socket once apiBase is known (or fallback to same origin)
  useEffect(() => {
    if (socketRef.current) return; // already created
    const socket = getSocket(apiBase || undefined);
    socketRef.current = socket;

    return () => {
      socketRef.current = null;
    };
  }, [apiBase]);

  // Join quiz room on socket
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !quizId) return;

    // named handler
    const handleQuizStarted = (data: any) => {
      console.log('quizStarted', data);
      // update UI or navigate
    };

    s.emit('joinQuiz', quizId);
    s.on('quizStarted', handleQuizStarted);

    return () => {
      s.off('quizStarted', handleQuizStarted);
      s.emit('leaveQuiz', quizId);
    };
  }, [quizId]);

  // Poll for players and quiz state
  useEffect(() => {
    if (!quizId || !apiBase) return;
    
    const interval = setInterval(async () => {
      try {
        // Get participants
        const playersRes = await fetch(`${apiBase}/api/admin/quizzes/${quizId}/participants`);
        if (playersRes.ok) {
          const playersList = await playersRes.json();
          setPlayers(Array.isArray(playersList) ? playersList : []);
        }
      } catch (error) {
        console.error('Error polling players:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [quizId, apiBase]);

  // Poll for current question index and sync questions
  useEffect(() => {
    if (!quizId || !apiBase) return;
    
    const interval = setInterval(async () => {
      try {
        // Get current quiz state (includes currentIndex)
        const stateRes = await fetch(`${apiBase}/api/student/quizzes/${quizId}/state`);
        if (stateRes.ok) {
          const state = await stateRes.json();
          console.log('Quiz state:', state);
          
          // If quiz has started and we have a valid current index
          if (state.started && typeof state.currentIndex === 'number' && state.currentIndex >= 0) {
            // Update current question index if it changed
            if (state.currentIndex !== currentQuestion) {
              console.log(`Admin advanced to question ${state.currentIndex}`);
              setCurrentQuestion(state.currentIndex);
              setGameState('question');
              setTimeLeft(20);
              setShowAnswers(false);
              setIsQuestionActive(true);
            }
          }
        }

        // Also refresh questions if empty
        if (questions.length === 0 && quizCode) {
          const qRes = await fetch(`${apiBase}/api/student/quiz-by-code?code=${quizCode}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            if (qData.questions && qData.questions.length > 0) {
              console.log('Loaded questions:', qData.questions);
              setQuestions(qData.questions.map((q: any) => ({
                question: q.questionText || q.question,
                options: Array.isArray(q.options) ? q.options : [],
                correct: Array.isArray(q.options)
                  ? Math.max(0, q.options.indexOf(q.correctAnswer))
                  : (typeof q.correct === 'number' ? q.correct : 0),
              })));
            }
          }
        }
      } catch (error) {
        console.error('Error polling quiz state:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [quizId, quizCode, currentQuestion, questions.length, apiBase]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQuestionActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isQuestionActive) {
      // Time's up - show answers
      setIsQuestionActive(false);
      setShowAnswers(true);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isQuestionActive]);

  const startQuestion = async () => {
    setGameState('question');
    setTimeLeft(20);
    setShowAnswers(false);
    setIsQuestionActive(true);
    
    // Advance question on server
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/api/admin/quizzes/${quizId}/next`, { method: 'PUT' });
    } catch (error) {
      console.error('Error advancing question:', error);
    }
  };

  const showResults = () => {
    setGameState('answers');
    setIsQuestionActive(false);
    setShowAnswers(true);
  };

  const nextQuestion = async () => {
    // Advance question on server; let polling update currentQuestion
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/api/admin/quizzes/${quizId}/next`, { method: 'PUT' });
      setGameState('question');
      setTimeLeft(20);
      setShowAnswers(false);
      setIsQuestionActive(true);
    } catch (error) {
      console.error('Error advancing question:', error);
    }
  };

  const showLeaderboard = () => {
    setGameState('leaderboard');
  };

  if (!quizCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 text-center max-w-md">
          <Tv className="mx-auto text-purple-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Host Screen Setup</h2>
          <p className="text-gray-600 mb-4">
            This screen should be displayed on a projector or large screen for all players to see.
          </p>
          <p className="text-sm text-gray-500">
            Go to Admin Panel to start a quiz and get the host screen link.
          </p>
        </div>
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">peekaboo</h1>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 inline-block">
              <div className="text-4xl font-bold text-white mb-2">Game PIN: {quizCode}</div>
              <div className="text-white/90">Join at: {typeof window !== 'undefined' ? window.location.origin.replace('http://', '') : ''}/student</div>
            </div>
          </div>

          {/* QR Code Section for Easy Mobile Access */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">📱 Scan to Join</h2>
              {qrCodeUrl ? (
                <div className="bg-white p-6 rounded-2xl inline-block">
                  <img 
                    src={qrCodeUrl} 
                    alt="Scan QR Code to Join Quiz" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              ) : (
                <div className="bg-white/20 p-6 rounded-2xl">
                  <div className="w-48 h-48 flex items-center justify-center text-white/60">
                    Generating QR Code...
                  </div>
                </div>
              )}
              <p className="text-white/90 text-lg mt-4">
                Point your phone camera at this code
              </p>
              <p className="text-white/70 text-sm">
                Or manually go to: {typeof window !== 'undefined' ? window.location.origin.replace('http://', '') : ''}/student
              </p>
            </div>
          </div>

          {/* Players Grid */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center">
                <Users className="mr-3" size={36} />
                Players ({players.length})
              </h2>
              <button 
                onClick={startQuestion}
                disabled={players.length === 0}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Play className="mr-2" size={24} />
                Start Quiz
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {players.map((player, index) => (
                <div key={index} className="bg-white/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{player.name}</div>
                  <div className="text-white/80">Ready</div>
                </div>
              ))}
            </div>
            
            {players.length === 0 && (
              <div className="text-center text-white/80 py-12">
                <Users size={64} className="mx-auto mb-4 opacity-50" />
                <div className="text-xl">Waiting for players to join...</div>
                  <div className="text-sm text-gray-200 mt-2">Students can scan the QR code above or visit: {typeof window !== 'undefined' ? window.location.origin.replace('http://', '') : ''}/student</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'question' || gameState === 'answers') {
    const question = questions[currentQuestion];
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    const shapes = ['🔺', '🔷', '⭐', '⭕'];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Question Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white text-xl">Question {currentQuestion + 1} of {questions.length}</div>
              <div className="text-white text-xl">Game PIN: {quizCode}</div>
            </div>
            
            {isQuestionActive && (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-block mb-4">
                <div className="flex items-center text-white">
                  <Clock className="mr-2" size={24} />
                  <span className="text-2xl font-bold">{timeLeft}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="bg-white rounded-3xl p-8 mb-8 text-center">
            {question?.question ? (
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                {question.question}
              </h2>
            ) : (
              <div className="text-2xl text-gray-500 py-8">
                <Clock className="mx-auto mb-4" size={48} />
                <p>Waiting for question from admin...</p>
              </div>
            )}
          </div>

          {/* Answer Options */}
          {question?.options ? (
            <div className="grid grid-cols-2 gap-6">
              {question.options.map((option: string, index: number) => (
                <div
                  key={index}
                  className={`${colors[index]} rounded-2xl p-8 text-center transform transition-all duration-300 ${
                    showAnswers ? (index === question?.correct ? 'scale-105 ring-4 ring-white' : 'opacity-60') : ''
                  }`}
                >
                  <div className="text-white">
                    <div className="text-6xl mb-4">{shapes[index]}</div>
                    <div className="text-2xl font-bold">{option}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={`${colors[index]} rounded-2xl p-8 text-center opacity-40`}>
                  <div className="text-white">
                    <div className="text-6xl mb-4">{shapes[index]}</div>
                    <div className="text-xl text-white/60">---</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center mt-8 space-x-4">
            {isQuestionActive && (
              <button 
                onClick={showResults}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl text-xl"
              >
                Show Answers
              </button>
            )}
            
            {showAnswers && (
              <>
                <button 
                  onClick={showLeaderboard}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center"
                >
                  <Trophy className="mr-2" size={24} />
                  Leaderboard
                </button>
                
                <button 
                  onClick={() => {
                    if (currentQuestion < questions.length - 1) {
                      nextQuestion();
                    } else {
                      setGameState('leaderboard');
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center"
                >
                  {currentQuestion < questions.length - 1 ? (
                    <>Next Question <ChevronRight className="ml-2" size={24} /></>
                  ) : (
                    'Finish Quiz'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const podiumColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500'];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">🏆 Leaderboard 🏆</h1>
            <div className="text-2xl text-white/90">Question {currentQuestion + 1} Results</div>
          </div>

          {/* Top 3 Podium */}
          <div className="flex justify-center items-end mb-8 space-x-4">
            {(() => {
              const top3 = sortedPlayers.slice(0, 3);
              const order = [1, 0, 2]; // visual order: second, first, third
              const heightByRank: Record<number, string> = { 1: 'h-48', 2: 'h-40', 3: 'h-32' };
              const colorByRank: Record<number, string> = { 1: 'bg-yellow-500', 2: 'bg-gray-400', 3: 'bg-orange-500' };
              return order.map((i) => {
                const player = top3[i];
                if (!player) return null;
                const rank = i + 1; // rank is based on sorted order index
                return (
                  <div key={player.name} className="text-center">
                    <div className={`${colorByRank[rank]} ${heightByRank[rank]} w-32 rounded-t-2xl flex flex-col justify-end p-4`}>
                      <div className="text-white font-bold text-lg">{player.name}</div>
                      <div className="text-white text-2xl font-bold">{player.score || 0}</div>
                    </div>
                    <div className="bg-white/20 text-white font-bold py-2 px-4 rounded-b-2xl">
                      #{rank}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Full Leaderboard */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-8">
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.name} className="bg-white/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl font-bold text-white w-12">#{index + 1}</div>
                    <div className="text-xl font-semibold text-white">{player.name}</div>
                  </div>
                  <div className="text-2xl font-bold text-white">{player.score || 0} pts</div>
                </div>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button 
              onClick={() => {
                if (currentQuestion < questions.length - 1) {
                  nextQuestion();
                } else {
                  setGameState('finished');
                }
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center mx-auto"
            >
              {currentQuestion < questions.length - 1 ? (
                <>Continue <ChevronRight className="ml-2" size={24} /></>
              ) : (
                'Exit Quize'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 flex items-center justify-center p-8">
      <div className="text-center text-white">
        <Trophy size={64} className="mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">Quiz Complete!</h1>
        <p className="text-xl">Thanks for playing!</p>
      </div>
    </div>
  );
};

export default HostScreen;
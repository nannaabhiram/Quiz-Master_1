import React, { createContext, useContext, useState, useEffect } from 'react';

// Quiz Context for real-time communication
const QuizContext = createContext();

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};

export const QuizProvider = ({ children }) => {
  const [quizState, setQuizState] = useState({
    isActive: false,
    currentQuestion: 0,
    questions: [],
    quizCode: 'ABC123',
    students: [],
    showResults: false,
    quizEnded: false
  });

  // Listen for quiz state changes across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'quizState') {
        const newState = JSON.parse(e.newValue);
        setQuizState(newState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Load initial state
    const savedState = localStorage.getItem('quizState');
    if (savedState) {
      setQuizState(JSON.parse(savedState));
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem('quizState', JSON.stringify(quizState));
  }, [quizState]);

  const startQuiz = (questions) => {
    const newState = {
      ...quizState,
      isActive: true,
      questions,
      currentQuestion: 0,
      showResults: false,
      quizEnded: false,
      students: []
    };
    setQuizState(newState);
    
    // Broadcast to other tabs/windows
    window.dispatchEvent(new CustomEvent('quizStarted', { 
      detail: newState 
    }));
  };

  const nextQuestion = () => {
    if (quizState.currentQuestion < quizState.questions.length - 1) {
      const newState = {
        ...quizState,
        currentQuestion: quizState.currentQuestion + 1
      };
      setQuizState(newState);
    } else {
      endQuiz();
    }
  };

  const endQuiz = () => {
    const newState = {
      ...quizState,
      isActive: false,
      showResults: true,
      quizEnded: true
    };
    setQuizState(newState);
  };

  const joinQuiz = (playerName, code) => {
    // Hardcode for abc123
    if (
      code.toLowerCase() === 'abc123' &&
      quizState.questions.length === 0
    ) {
      const hardcodedQuestions = [
        {
          question: '2 + 2 = ?',
          options: ['3', '4', '5', '22'],
          correct: 1,
          points: 1000,
        },
      ];
      const newState = {
        ...quizState,
        questions: hardcodedQuestions,
        quizCode: 'abc123',
        isActive: true,
        showResults: false,
        quizEnded: false,
        currentQuestion: 0,
        students: [
          ...quizState.students,
          {
            id: Date.now(),
            name: playerName,
            score: 0,
            answered: 0,
          },
        ],
      };
      setQuizState(newState);
      return true;
    }

    if (code === quizState.quizCode) {
      const newStudent = {
        id: Date.now(),
        name: playerName,
        score: 0,
        answered: 0,
      };

      const newState = {
        ...quizState,
        students: [...quizState.students, newStudent],
      };
      setQuizState(newState);
      return true;
    }
    return false;
  };

  const submitAnswer = (studentId, answerIndex, timeLeft) => {
    const currentQ = quizState.questions[quizState.currentQuestion];
    const isCorrect = answerIndex === currentQ.correct;
    const timeBonus = Math.floor((timeLeft / 20) * 500);
    const points = isCorrect ? currentQ.points + timeBonus : 0;

    const newState = {
      ...quizState,
      students: quizState.students.map(student => 
        student.id === studentId 
          ? { 
              ...student, 
              score: student.score + points,
              answered: student.answered + 1
            }
          : student
      )
    };
    setQuizState(newState);
  };

  const resetQuiz = () => {
    const newState = {
      isActive: false,
      currentQuestion: 0,
      questions: [],
      quizCode: 'ABC123',
      students: [],
      showResults: false,
      quizEnded: false
    };
    setQuizState(newState);
  };

  return (
    <QuizContext.Provider 
      value={{
        quizState,
        setQuizState, // <-- add this line
        startQuiz,
        nextQuestion,
        endQuiz,
        joinQuiz,
        submitAnswer,
        resetQuiz
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};
import React, { createContext, useContext, useState, useEffect } from 'react';

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
    isStarted: false,
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
        try {
          const newState = JSON.parse(e.newValue);
          setQuizState(newState);
        } catch (error) {
          console.error('Error parsing quiz state from localStorage:', error);
        }
      }
    };

    // Listen for custom events
    const handleQuizStarted = (e) => {
      setQuizState(e.detail);
    };

    const handleQuestionChanged = (e) => {
      setQuizState(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('quizStarted', handleQuizStarted);
    window.addEventListener('questionChanged', handleQuestionChanged);
    
    // Load initial state
    const savedState = localStorage.getItem('quizState');
    if (savedState) {
      try {
        setQuizState(JSON.parse(savedState));
      } catch (error) {
        console.error('Error loading quiz state from localStorage:', error);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quizStarted', handleQuizStarted);
      window.removeEventListener('questionChanged', handleQuestionChanged);
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
      isStarted: false, // Quiz is set up but not started yet
      questions,
      currentQuestion: 0,
      showResults: false,
      quizEnded: false,
      students: [...quizState.students]
    };
    setQuizState(newState);
  };

  const actuallyStartQuiz = () => {
    const newState = {
      ...quizState,
      isStarted: true // Now the quiz actually starts
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
      
      // Broadcast to all tabs
      window.dispatchEvent(new CustomEvent('questionChanged', { 
        detail: newState 
      }));
    } else {
      endQuiz();
    }
  };

  const endQuiz = () => {
    const newState = {
      ...quizState,
      isActive: false,
      isStarted: false,
      showResults: true,
      quizEnded: true
    };
    setQuizState(newState);
  };

  const joinQuiz = (playerName, code, studentId) => {
    if (code.toLowerCase() === quizState.quizCode.toLowerCase()) {
      const existingStudent = quizState.students.find(s => s.id === studentId);
      if (existingStudent) {
        return true;
      }

      const newStudent = {
        id: studentId || Date.now(),
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
    if (!quizState.questions[quizState.currentQuestion]) return;
    
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
      isStarted: false,
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
        setQuizState,
        startQuiz,
        actuallyStartQuiz,
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
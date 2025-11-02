import React, { createContext, useContext, useState, useEffect } from 'react';

const quizContext = createContext();

export const usequiz = () => {
  const context = useContext(quizContext);
  if (!context) {
    throw new Error('usequiz must be used within a quizProvider');
  }
  return context;
};

export const quizProvider = ({ children }) => {
  const [quizState, setquizState] = useState({
    isActive: false,
    isStarted: false,
    currentQuestion: 0,
    questions: [],
    quizCode: 'ABC123',
    students: [],
    showResults: false,
    quiznded: false
  });

  // Listen for quiz state changes across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'quizState') {
        try {
          const newState = JSON.parse(e.newValue);
          setquizState(newState);
        } catch (error) {
          console.error('Error parsing quiz state from localStorage:', error);
        }
      }
    };

    // Listen for custom events
    const handlequizStarted = (e) => {
      setquizState(e.detail);
    };

    const handleQuestionChanged = (e) => {
      setquizState(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('quizStarted', handlequizStarted);
    window.addEventListener('questionChanged', handleQuestionChanged);
    
    // Load initial state
    const savedState = localStorage.getItem('quizState');
    if (savedState) {
      try {
        setquizState(JSON.parse(savedState));
      } catch (error) {
        console.error('Error loading quiz state from localStorage:', error);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quizStarted', handlequizStarted);
      window.removeEventListener('questionChanged', handleQuestionChanged);
    };
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem('quizState', JSON.stringify(quizState));
  }, [quizState]);

  const startquiz = (questions) => {
    const newState = {
      ...quizState,
      isActive: true,
      isStarted: false, // quiz is set up but not started yet
      questions,
      currentQuestion: 0,
      showResults: false,
      quiznded: false,
      students: [...quizState.students]
    };
    setquizState(newState);
  };

  const actuallyStartquiz = () => {
    const newState = {
      ...quizState,
      isStarted: true // Now the quiz actually starts
    };
    setquizState(newState);
    
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
      setquizState(newState);
      
      // Broadcast to all tabs
      window.dispatchEvent(new CustomEvent('questionChanged', { 
        detail: newState 
      }));
    } else {
      endquiz();
    }
  };

  const endquiz = () => {
    const newState = {
      ...quizState,
      isActive: false,
      isStarted: false,
      showResults: true,
      quiznded: true
    };
    setquizState(newState);
  };

  const joinquiz = (playerName, code, studentId) => {
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
      setquizState(newState);
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
    setquizState(newState);
  };

  const resetquiz = () => {
    const newState = {
      isActive: false,
      isStarted: false,
      currentQuestion: 0,
      questions: [],
      quizCode: 'ABC123',
      students: [],
      showResults: false,
      quiznded: false
    };
    setquizState(newState);
  };

  return (
    <quizContext.Provider 
      value={{
        quizState,
        setquizState,
        startquiz,
        actuallyStartquiz,
        nextQuestion,
        endquiz,
        joinquiz,
        submitAnswer,
        resetquiz
      }}
    >
      {children}
    </quizContext.Provider>
  );
};
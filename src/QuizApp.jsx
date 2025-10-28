import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Smartphone } from 'lucide-react';
import AdminPanel from './AdminPanel';
import StudentQuizApp from './StudentQuizApp';
import { QuizProvider } from './QuizContext';

// Main App Component with Home Page
const QuizApp = () => {
  const [currentPage, setCurrentPage] = useState('home');

  // Check for QR code join parameter on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      // If QR code scanned, go directly to student portal
      setCurrentPage('student');
      // Don't clear the URL parameter here - let StudentQuizApp handle it
    }
  }, []);

  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white bg-opacity-20 backdrop-blur-sm rounded-full mb-4">
              <Trophy className="text-white" size={48} />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">peekaboo</h1>
            <p className="text-xl text-white opacity-90">Interactive Quiz Platform</p>
          </div>
        </div>

        {/* Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Portal Card */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Admin Portal</h2>
              <p className="text-white opacity-80 mb-6 leading-relaxed">
                Create and manage quiz questions, control quiz sessions, and monitor student progress in real-time.
              </p>
              <ul className="text-white opacity-70 text-left mb-8 space-y-2">
                <li>• Create custom questions</li>
                <li>• Real-time quiz control</li>
                <li>• Live student tracking</li>
                <li>• Results analytics</li>
              </ul>
              <button
                onClick={() => setCurrentPage('admin')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-xl text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
              >
                Enter Admin Portal
              </button>
            </div>
          </div>

          {/* Student Portal Card */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl p-8 border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Student Portal</h2>
              <p className="text-white opacity-80 mb-6 leading-relaxed">
                Join quiz sessions using a code, answer questions, and compete with classmates in real-time.
              </p>
              <ul className="text-white opacity-70 text-left mb-8 space-y-2">
                <li>• Mobile-optimized interface</li>
                <li>• Real-time competition</li>
                <li>• Instant feedback</li>
                <li>• Live leaderboards</li>
              </ul>
              <button
                onClick={() => setCurrentPage('student')}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-4 px-8 rounded-xl text-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 shadow-lg"
              >
                Join as Student
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
            <h3 className="text-2xl font-bold text-white mb-6">Platform Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Clock className="mx-auto text-white mb-3" size={32} />
                <h4 className="font-semibold text-white mb-2">Real-time Interaction</h4>
                <p className="text-white opacity-70 text-sm">Live quiz sessions with instant feedback and timing</p>
              </div>
              <div className="text-center">
                <Trophy className="mx-auto text-white mb-3" size={32} />
                <h4 className="font-semibold text-white mb-2">Gamification</h4>
                <p className="text-white opacity-70 text-sm">Points, rankings, and competitive leaderboards</p>
              </div>
              <div className="text-center">
                <Smartphone className="mx-auto text-white mb-3" size={32} />
                <h4 className="font-semibold text-white mb-2">Mobile Friendly</h4>
                <p className="text-white opacity-70 text-sm">Optimized for all devices and screen sizes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render different pages based on current state
  switch (currentPage) {
    case 'admin':
      return (
        <QuizProvider>
          <AdminPanel onBack={() => setCurrentPage('home')} />
        </QuizProvider>
      );
    case 'student':
      return (
        <QuizProvider>
          <StudentQuizApp onBack={() => setCurrentPage('home')} />
        </QuizProvider>
      );
    default:
      return <HomePage />;
  }
};

export default QuizApp;
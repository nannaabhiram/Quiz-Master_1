import { useEffect } from 'react';
import { getSocket } from '../utils/socket';

/**
 * SocketListener - a global component that listens for server-sent Socket.IO events.
 * Mount this near the root of your app (in root.tsx) so it can handle quiz events.
 */
export default function SocketListener() {
  useEffect(() => {
    const socket = getSocket(); // get or create singleton

    // Handler for when a quiz starts (emitted by server when admin starts a quiz)
    function handleQuizStarted(data: any) {
      console.log('[socket] quizStarted event received:', data);
      // Optional: navigate to host screen or update UI globally
      // Example: navigate(`/host?quizId=${data.quizId}&code=${data.code}`);
      
      // You can dispatch to a global state manager (Redux, Zustand, Context) here
      // or just log for now and let individual screens react
    }

    // Register the listener
    socket.on('quizStarted', handleQuizStarted);

    // Cleanup: remove listener when component unmounts
    return () => {
      socket.off('quizStarted', handleQuizStarted);
    };
  }, []);

  return null; // This component doesn't render anything
}

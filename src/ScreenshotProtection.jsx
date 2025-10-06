import React, { useEffect, useState } from 'react';

const ScreenshotProtection = ({ children, onScreenshotDetected }) => {
  const [screenshotAttempts, setScreenshotAttempts] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    let keydownHandler;
    let visibilityHandler;
    let devtoolsChecker;

    // Detect screenshot key combinations
    keydownHandler = (e) => {
      // Common screenshot key combinations
      const isScreenshotKey = 
        (e.key === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) || // Mac screenshot
        (e.metaKey && e.shiftKey && e.key === 'S') || // Mac screenshot tool
        (e.ctrlKey && e.shiftKey && e.key === 'S') || // Windows snipping tool
        (e.altKey && e.key === 'PrintScreen'); // Alt + Print Screen

      if (isScreenshotKey) {
        e.preventDefault();
        handleScreenshotAttempt();
      }
    };

    // Detect tab visibility changes (possible screenshot tools)
    visibilityHandler = () => {
      if (document.hidden) {
        // User switched away from tab - could be using screenshot tool
        setTimeout(() => {
          if (!document.hidden) {
            // User came back quickly - possible screenshot
            handleScreenshotAttempt();
          }
        }, 100);
      }
    };

    // Basic devtools detection
    let devtools = {
      open: false,
      orientation: null
    };

    const threshold = 160;

    devtoolsChecker = setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          handleScreenshotAttempt();
        }
      } else {
        devtools.open = false;
      }
    }, 500);

    const handleScreenshotAttempt = () => {
      const newAttempts = screenshotAttempts + 1;
      setScreenshotAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        onScreenshotDetected?.();
      } else {
        // Show warning
        alert(`Screenshot attempt detected! ${maxAttempts - newAttempts} attempts remaining before quiz ends.`);
      }
    };

    // Add event listeners
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('visibilitychange', visibilityHandler);

    // Disable right-click context menu
    const contextMenuHandler = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', contextMenuHandler);

    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    // Cleanup
    return () => {
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      document.removeEventListener('contextmenu', contextMenuHandler);
      
      if (devtoolsChecker) {
        clearInterval(devtoolsChecker);
      }

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
    };
  }, [screenshotAttempts, onScreenshotDetected]);

  return (
    <div style={{ 
      position: 'relative',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}>
      {children}
      
      {/* Overlay to prevent some screenshot methods */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          background: 'transparent'
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {screenshotAttempts > 0 && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#ef4444',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ⚠️ Screenshot attempts: {screenshotAttempts}/{maxAttempts}
        </div>
      )}
    </div>
  );
};

export default ScreenshotProtection;
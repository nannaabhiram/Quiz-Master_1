import React, { useEffect, useRef } from 'react';

const TextToImage = ({ 
  text, 
  width = 400, 
  height = 100, 
  fontSize = 16, 
  className = '',
  backgroundColor = '#ffffff',
  textColor = '#000000',
  fontFamily = 'Arial, sans-serif'
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Set text properties
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Handle text wrapping
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > width - 20 && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    
    // Draw text lines
    const lineHeight = fontSize * 1.2;
    const startY = (height - (lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight);
    });
    
  }, [text, width, height, fontSize, backgroundColor, textColor, fontFamily]);

  return (
    <canvas 
      ref={canvasRef}
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

export default TextToImage;
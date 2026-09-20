import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';

export const DecoyPage: React.FC = () => {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewOperand, setWaitingForNewOperand] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);

  const handleDigit = (digit: string) => {
    if (waitingForNewOperand) {
      setDisplay(digit);
      setWaitingForNewOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForNewOperand) {
      setDisplay('0.');
      setWaitingForNewOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewOperand(false);
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(current);
    } else if (operation) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForNewOperand(true);
    setOperation(op);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? 0 : a / b;
      default:
        return b;
    }
  };

  const handleEquals = () => {
    // Check if secret PIN was entered (e.g. 1234 or 4321)
    if (display === '1234' || display === '4321') {
      navigate('/app');
      return;
    }

    const current = parseFloat(display);
    if (previousValue !== null && operation) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewOperand(true);
    }
  };

  // Long press handler for '=' to return to Raksha
  const handleEqualsMouseDown = () => {
    longPressTimerRef.current = window.setTimeout(() => {
      navigate('/app');
    }, 1800);
  };

  const handleEqualsMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Calculator</title>
      </Helmet>

      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-end p-6 select-none font-sans max-w-md mx-auto">
        {/* Top hidden return bar */}
        <div className="flex items-center justify-between pb-8 text-neutral-600 text-xs">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1 hover:text-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Raksha</span>
          </button>
          <span className="text-[10px] text-neutral-700">Hold = 2s or enter PIN + = to exit</span>
        </div>

        {/* Display */}
        <div className="text-right text-6xl sm:text-7xl font-light tracking-tight px-3 py-6 overflow-hidden text-white font-mono break-all">
          {display}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-3 text-2xl font-normal">
          <button
            type="button"
            onClick={handleClear}
            className="h-16 sm:h-18 rounded-full bg-neutral-400 hover:bg-neutral-300 text-black font-semibold flex items-center justify-center active:scale-95 transition-transform"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => setDisplay(String(parseFloat(display) * -1))}
            className="h-16 sm:h-18 rounded-full bg-neutral-400 hover:bg-neutral-300 text-black font-semibold flex items-center justify-center active:scale-95 transition-transform"
          >
            ±
          </button>
          <button
            type="button"
            onClick={() => setDisplay(String(parseFloat(display) / 100))}
            className="h-16 sm:h-18 rounded-full bg-neutral-400 hover:bg-neutral-300 text-black font-semibold flex items-center justify-center active:scale-95 transition-transform"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className={`h-16 sm:h-18 rounded-full font-semibold flex items-center justify-center active:scale-95 transition-transform ${
              operation === '÷' ? 'bg-white text-amber-500' : 'bg-amber-500 hover:bg-amber-400 text-white'
            }`}
          >
            ÷
          </button>

          {['7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 sm:h-18 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className={`h-16 sm:h-18 rounded-full font-semibold flex items-center justify-center active:scale-95 transition-transform ${
              operation === '×' ? 'bg-white text-amber-500' : 'bg-amber-500 hover:bg-amber-400 text-white'
            }`}
          >
            ×
          </button>

          {['4', '5', '6'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 sm:h-18 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className={`h-16 sm:h-18 rounded-full font-semibold flex items-center justify-center active:scale-95 transition-transform ${
              operation === '-' ? 'bg-white text-amber-500' : 'bg-amber-500 hover:bg-amber-400 text-white'
            }`}
          >
            -
          </button>

          {['1', '2', '3'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 sm:h-18 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className={`h-16 sm:h-18 rounded-full font-semibold flex items-center justify-center active:scale-95 transition-transform ${
              operation === '+' ? 'bg-white text-amber-500' : 'bg-amber-500 hover:bg-amber-400 text-white'
            }`}
          >
            +
          </button>

          {/* 0 (spans 2 cols) */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="col-span-2 h-16 sm:h-18 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-start pl-8 active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDecimal}
            className="h-16 sm:h-18 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            onMouseDown={handleEqualsMouseDown}
            onMouseUp={handleEqualsMouseUp}
            onTouchStart={handleEqualsMouseDown}
            onTouchEnd={handleEqualsMouseUp}
            className="h-16 sm:h-18 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-semibold flex items-center justify-center active:scale-95 transition-transform"
          >
            =
          </button>
        </div>
      </div>
    </>
  );
};

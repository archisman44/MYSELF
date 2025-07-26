
import { useState, useEffect, useRef, useCallback } from 'react';

// Define interfaces for the Web Speech API to ensure TypeScript compatibility.
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
}

// Augment the window object type to include vendor-prefixed SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: { new(): ISpeechRecognition };
        webkitSpeechRecognition: { new(): ISpeechRecognition };
    }
}

// Polyfill for cross-browser compatibility
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeech = (onTranscriptUpdate: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Speech Recognition (Speech-to-Text)
  const startListening = useCallback(() => {
    if (isListening || !SpeechRecognition) {
      if (!SpeechRecognition) console.error("Speech Recognition is not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setRecognitionError(event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      onTranscriptUpdate(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, onTranscriptUpdate]);

  const stopListening = useCallback(() => {
    if (!isListening || !recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, [isListening]);

  // Speech Synthesis (Text-to-Speech)
  const speak = useCallback((text: string, onEnd: () => void) => {
    if (!text || !window.speechSynthesis) return;

    // Cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = onEnd;
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        // "interrupted" and "canceled" are expected errors when we manually stop speech.
        // We don't need to log them as critical errors.
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
            console.error("Speech synthesis error:", event.error);
        }
        onEnd(); // Ensure state cleanup happens even on error/interruption.
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancelSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return { isListening, startListening, stopListening, speak, cancelSpeaking, recognitionError };
};

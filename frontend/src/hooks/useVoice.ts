import { useState, useEffect, useCallback } from 'react';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            currentTranscript += result[0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recog.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}

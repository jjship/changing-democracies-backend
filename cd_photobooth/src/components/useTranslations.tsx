import { useEffect, useState } from 'react';
import { TextContent, translations } from './boothConstants';
import { useBoothContext } from './BoothContext';

export const useTranslations = () => {
  const { currentLang } = useBoothContext();

  const [translated, setTranslated] = useState<TextContent>({
    make: 'Make your own poster',
    express: 'Add your statement about democracy',
    whatName: 'What is your name?',
    writeStatement: 'Write your statement',
    next: 'Next',
    finish: 'Finish',
    repeat: 'Repeat picture',
    take: 'Take a picture',
    start: 'Start',
  });

  useEffect(() => {
    if (currentLang) setTranslated(translations[currentLang]);
  }, [currentLang]);

  return translated;
};

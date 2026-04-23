import { CSSProperties } from 'react';

export const INACTIVITY_THRESHOLD = 180000; // 3 minutes in milliseconds

export type Params = {
  currentLang: Language | '';
  stage: number;
};

export interface CSSPropertiesWithVars extends CSSProperties {
  '--start-y'?: string;
  '--end-y'?: string;
}

export const boothBtn = 'bg-darkRed text-2xl hover:bg-pink font-black';

export const languages: Language[] = [
  'english',
  'polish',
  'greek',
  'dutch',
  'french',
  'czech',
  'croatian',
  'lithuanian',
  'spanish',
  'portuguese',
  'romanian',
];

export type Language = keyof typeof languageAbbreviations;

export type LanguageAbbreviations = typeof languageAbbreviations;

export const languageAbbreviations = {
  english: 'EN',
  polish: 'PL',
  greek: 'GR',
  dutch: 'NL',
  french: 'FR',
  czech: 'CZ',
  croatian: 'HR',
  lithuanian: 'LT',
  spanish: 'ES',
  portuguese: 'PT',
  romanian: 'RO',
} as const;

export type TextContent = {
  make: string;
  express: string;
  whatName: string;
  writeStatement: string;
  next: string;
  finish: string;
  repeat: string;
  take: string;
  start: string;
};

export const translations: Record<Language, TextContent> = {
  english: {
    make: 'Make your own poster',
    express: 'Add your statement about democracy',
    whatName: 'What is your name?',
    writeStatement: 'Write your statement',
    next: 'Next',
    finish: 'Finish',
    repeat: 'Repeat picture',
    take: 'Take a picture',
    start: 'Start',
  },
  polish: {
    make: 'Stwórz własny plakat',
    express: 'Wyraź swoje uczucia o demokracji',
    whatName: 'Jak masz na imię?',
    writeStatement: 'Napisz swoje oświadczenie',
    next: 'Dalej',
    finish: 'Zakończ',
    repeat: 'Powtórz zdjęcie',
    take: 'Zrób zdjęcie',
    start: 'Start',
  },
  greek: {
    make: 'Φτιάξε τη δική σου αφίσα',
    express: 'Εκφράστε τα συναισθήματά σας για τη Δημοκρατία',
    whatName: 'Πώς σε λένε;',
    writeStatement: 'Γράψτε τη δήλωσή σας',
    next: 'Επόμενο',
    finish: 'Τελείωσε',
    repeat: 'Επανάληψη φωτογραφίας',
    take: 'Βγάλτε μια φωτογραφία',
    start: 'Έναρξη',
  },
  dutch: {
    make: 'Maak je eigen poster',
    express: 'Voeg jouw inzicht over democratie toe',
    whatName: 'Hoe heet je?',
    writeStatement: 'Schrijf jouw boodschap',
    next: 'Volgende',
    finish: 'Afronden',
    repeat: 'Foto herhalen',
    take: 'Maak een foto',
    start: 'Starten',
  },
  french: {
    make: 'Créez votre propre affiche',
    express: 'Exprimez vos sentiments sur la démocratie',
    whatName: 'Quel est votre nom?',
    writeStatement: 'Rédigez votre déclaration',
    next: 'Suivant',
    finish: 'Terminer',
    repeat: 'Répéter la photo',
    take: 'Prenez une photo',
    start: 'Commencer',
  },
  czech: {
    make: 'Vytvořte si vlastní plakát',
    express: 'Vyjádřete své pocity vůči demokracii',
    whatName: 'Jaké je vaše jméno?',
    writeStatement: 'Napište své prohlášení',
    next: 'Další',
    finish: 'Dokončit',
    repeat: 'Opakovat obrázek',
    take: 'Vyfotit',
    start: 'Začít',
  },
  croatian: {
    make: 'Napravite vlastiti poster',
    express: 'Izrazite svoje osjećaje o demokraciji',
    whatName: 'Kako se zoveš?',
    writeStatement: 'Napišite svoju izjavu',
    next: 'Sljedeći',
    finish: 'Završi',
    repeat: 'Ponovi sliku',
    take: 'Uslikaj',
    start: 'Počni',
  },
  lithuanian: {
    make: 'Sukurkite savo plakatą',
    express: 'Išreikškite savo jausmus apie demokratiją',
    whatName: 'Koks tavo vardas?',
    writeStatement: 'Parašykite savo pareiškimą',
    next: 'Toliau',
    finish: 'Baigti',
    repeat: 'Pakartoti nuotrauką',
    take: 'Padarykite nuotrauką',
    start: 'Pradėti',
  },
  spanish: {
    make: 'Haz tu propio póster',
    express: 'Expresa tus sentimientos sobre la democracia',
    whatName: '¿Cómo te llamas?',
    writeStatement: 'Escribe tu declaración',
    next: 'Siguiente',
    finish: 'Finalizar',
    repeat: 'Repetir foto',
    take: 'Tomar una foto',
    start: 'Iniciar',
  },
  portuguese: {
    make: 'Faça seu próprio cartaz',
    express: 'Expresse seus sentimentos sobre a democracia',
    whatName: 'Qual é o seu nome?',
    writeStatement: 'Escreva sua declaração',
    next: 'Próximo',
    finish: 'Concluir',
    repeat: 'Repetir foto',
    take: 'Tirar uma foto',
    start: 'Iniciar',
  },
  romanian: {
    make: 'Fă-ți propriul poster',
    express: 'Exprimă-ți sentimentele despre democrație',
    whatName: 'Cum te numești?',
    writeStatement: 'Scrie-ți declarația',
    next: 'Următorul',
    finish: 'Finalizează',
    repeat: 'Repetă poza',
    take: 'Fă o poză',
    start: 'Începe',
  },
} as const;

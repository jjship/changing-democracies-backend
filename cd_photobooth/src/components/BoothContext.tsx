import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Language } from './boothConstants';

type BoothContextType = {
  stage: number;
  setStage: Dispatch<SetStateAction<number>>;
  currentLang: Language;
  setCurrentLang: Dispatch<SetStateAction<Language>>;
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  prevLocations: string[];
  setPrevLocations: Dispatch<SetStateAction<string[]>>;
  windowHeight: number;
  windowWidth: number;
  userName: string | null;
  setUserName: Dispatch<SetStateAction<string | null>>;
  statements: string[] | null;
  setStatements: Dispatch<SetStateAction<string[] | null>>;
  filename: string | null;
  setFilename: Dispatch<SetStateAction<string | null>>;
  fontFamily: string;
  setFontFamily: Dispatch<SetStateAction<string>>;
};

const BoothContext = createContext<BoothContextType | null>(null);

export const BoothContextProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<string>('');
  const [prevLocations, setPrevLocations] = useState<string[]>(['']);
  const [stage, setStage] = useState<number>(0);
  const [currentLang, setCurrentLang] = useState<Language>('english');
  const [userName, setUserName] = useState<string | null>(null);
  const [statements, setStatements] = useState<string[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("'Archivo', sans-serif");
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <BoothContext.Provider
      value={{
        stage,
        setStage,
        currentLang,
        setCurrentLang,
        location,
        setLocation,
        prevLocations,
        setPrevLocations,
        windowHeight: windowSize.height,
        windowWidth: windowSize.width,
        userName,
        setUserName,
        statements,
        setStatements,
        filename,
        setFilename,
        fontFamily,
        setFontFamily,
      }}
    >
      {children}
    </BoothContext.Provider>
  );
};

export const useBoothContext = () => {
  const context = useContext(BoothContext);
  if (!context) {
    throw new Error('useBoothContext must be used within a BoothContextProvider');
  }
  return context;
};

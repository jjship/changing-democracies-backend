import { FC, useEffect } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useBoothContext } from './BoothContext';
import { LanguageButtons } from './LanguageButtons';
import { NameForm } from './NameForm';
import { StatementsForm } from './StatementsForm';
import { SaveAndSend } from './SaveAndSend';
import { PostersGallery } from './PostersGallery';
import { MakePhoto } from './MakePhoto';
import { LocationForm } from './LocationForm';
import { MakerStart } from './MakerStart';

export const ReactBooth: FC = () => {
  const { setStage, stage, currentLang, windowHeight, windowWidth, fontFamily, setFontFamily } =
    useBoothContext();

  const onIdle = () => setStage(0);

  useIdleTimer({
    onIdle,
    timeout: 180_000,
    throttle: 500,
  });

  useEffect(() => {
    const currFontFamily =
      stage > -1 && currentLang === 'greek'
        ? "'Open Sans', sans-serif"
        : "'Archivo', sans-serif";
    setFontFamily(currFontFamily);
  }, [stage, currentLang, setFontFamily]);

  if (!windowHeight || !windowWidth) {
    return null;
  }

  return (
    <div className="flex h-full w-screen flex-col items-center" style={{ fontFamily }}>
      <PostersGallery />
      <LocationForm />
      <LanguageButtons />
      <MakerStart />
      <NameForm />
      <StatementsForm />
      <MakePhoto />
      <SaveAndSend />
    </div>
  );
};

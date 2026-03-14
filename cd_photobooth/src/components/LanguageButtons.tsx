import { FC } from 'react';
import { useBoothContext } from './BoothContext';
import { languages } from './boothConstants';
import { BtnLang } from './BtnLang';
import { BackBtn } from './BackBtn';

export const LanguageButtons: FC = () => {
  const { windowHeight, stage } = useBoothContext();
  const thisStage = 2;
  const width = 120;
  const height = 50;
  const buttonSpacing = 30;
  const startY =
    (windowHeight - (height * languages.length + buttonSpacing * (languages.length - 1))) / 4;

  if (stage !== thisStage) return null;

  return (
    <>
      <BackBtn nextStage={0} />
      <p className="mt-24 pb-0 text-3xl">Choose your language</p>
      {languages.map((lang, i) => {
        const btnY = startY + i * buttonSpacing;
        return (
          <BtnLang
            key={lang}
            language={lang}
            width={width}
            height={height}
            btnY={btnY}
            windowHeight={windowHeight}
            thisStage={thisStage}
          />
        );
      })}
    </>
  );
};

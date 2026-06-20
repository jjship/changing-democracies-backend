import { FC } from 'react';
import { Animate } from 'react-simple-animate';
import { languageAbbreviations, Language, boothBtn } from './boothConstants';
import { Button } from './ui/button';
import { useBoothContext } from './BoothContext';

type BtnLangProps = {
  language: Language;
  width: number;
  height: number;
  btnY: number;
  windowHeight: number;
  thisStage: number;
};

export const BtnLang: FC<BtnLangProps> = ({
  language,
  width,
  height,
  btnY,
  windowHeight,
  thisStage,
}) => {
  const { setStage, setCurrentLang } = useBoothContext();

  const handleClick = () => {
    setCurrentLang(language);
    setStage(thisStage + 1);
  };

  return (
    <Animate
      play={true}
      start={{ opacity: 1, transform: `translateY(${windowHeight}px)` }}
      end={{ opacity: 1, transform: `translateY(${btnY}px)` }}
      duration={1.2}
      easeType="ease-out"
    >
      <Button
        className={boothBtn}
        style={{ width: `${width}px`, height: `${height}px` }}
        onClick={handleClick}
      >
        {languageAbbreviations[language]}
      </Button>
    </Animate>
  );
};

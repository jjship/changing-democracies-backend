import { FC } from 'react';
import { Animate } from 'react-simple-animate';
import { Button } from './ui/button';
import { useBoothContext } from './BoothContext';
import { boothBtn } from './boothConstants';

type DavButtonProps = {
  txt: string;
  btnY: number;
  width: number;
  nextStage?: number | null;
  windowHeight: number;
};

export const DavButton: FC<DavButtonProps> = ({
  txt,
  btnY,
  width,
  nextStage = null,
  windowHeight,
}) => {
  const { setStage, stage } = useBoothContext();

  const handleClick = () => {
    const stageToSet = nextStage ?? stage + 1;
    setStage(stageToSet);
  };

  return (
    <Animate
      play={true}
      start={{ opacity: 1, transform: `translateY(${btnY + windowHeight}px)` }}
      end={{ opacity: 1, transform: `translateY(${btnY}px)` }}
      duration={0.9}
      easeType="ease-in-out"
    >
      <Button
        className={boothBtn}
        style={{ width: `${width}px`, height: '50px' }}
        onClick={handleClick}
      >
        {txt}
      </Button>
    </Animate>
  );
};

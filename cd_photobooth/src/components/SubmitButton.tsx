import { FC } from 'react';
import { Animate } from 'react-simple-animate';
import { Button } from './ui/button';
import { useBoothContext } from './BoothContext';
import { boothBtn } from './boothConstants';

type SubmitButtonProps = {
  txt: string;
  btnY: number;
  width: number;
  windowHeight: number;
};

export const SubmitButton: FC<SubmitButtonProps> = ({ txt, btnY, width, windowHeight }) => {
  const { setStage, stage } = useBoothContext();

  const handleClick = () => {
    setStage(stage + 1);
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
        type="submit"
        className={boothBtn}
        style={{ width: `${width}px`, height: '50px' }}
        onClick={handleClick}
      >
        {txt}
      </Button>
    </Animate>
  );
};

import { FC } from 'react';
import { Button } from './ui/button';
import { useBoothContext } from './BoothContext';

type BackProps = {
  nextStage?: number;
};

export const BackBtn: FC<BackProps> = ({ nextStage }) => {
  const { setStage } = useBoothContext();

  const handleClick = () => {
    if (nextStage !== undefined) {
      setStage(nextStage);
      return;
    }
    setStage((prev) => prev - 1);
  };

  return (
    <Button
      className="absolute left-0 top-20 bg-transparent hover:bg-transparent"
      onClick={handleClick}
    >
      <img src="/back_arrow.svg" alt="back arrow" />
    </Button>
  );
};

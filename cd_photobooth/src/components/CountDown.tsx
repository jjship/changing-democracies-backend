import { FC, useEffect, useState } from 'react';

interface CountDownProps {
  start: boolean;
}

export const CountDown: FC<CountDownProps> = ({ start }) => {
  const [num, setNum] = useState<number>(3);

  useEffect(() => {
    if (start) {
      setNum(3);
      const interval = setInterval(() => {
        setNum((prev) => {
          if (prev === 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [start]);

  return start && num > 0 ? (
    <div className="absolute bottom-0 left-0 right-0 top-0 m-auto h-56 w-56 animate-[ping_1.01s_linear_infinite] rounded-full bg-darkRed">
      <div className="absolute top-[33%] w-full text-center text-7xl font-black text-black">
        {num}
      </div>
    </div>
  ) : null;
};

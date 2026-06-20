import { BoothContextProvider } from './components/BoothContext';
import { ReactBooth } from './components/ReactBooth';

export const App = () => {
  return (
    <BoothContextProvider>
      <ReactBooth />
    </BoothContextProvider>
  );
};

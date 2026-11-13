import { BoothContextProvider } from './components/BoothContext';
import { ReactBooth } from './components/ReactBooth';

export const App = () => {
  return (
    <main className="h-screen bg-turquoise font-black antialiased">
      <BoothContextProvider>
        <ReactBooth />
      </BoothContextProvider>
    </main>
  );
};

import { FC, useCallback, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useImageLoader } from './useImageLoader';
import { photoboothApi } from '../api/photobooth-api';
import { EmailForm } from './EmailForm';
import { editButton } from './classNames';
import { useBoothContext } from './BoothContext';
import { boothBtn } from './boothConstants';
import { canvasRatio } from './MakePhoto';

const thisStage = 7;

export const SaveAndSend: FC = () => {
  const [isSending, setIsSending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const {
    filename,
    setFilename,
    setStage,
    location,
    stage,
    setUserName,
    setStatements,
    windowHeight,
  } = useBoothContext();

  useEffect(() => {
    if (!filename) return;
    setImageUrl(photoboothApi.getPosterImageUrl(filename));
  }, [filename]);

  useEffect(() => {
    if (stage === thisStage) {
      setIsSending(false);
    }
  }, [stage]);

  const { handleError, handleLoad, error, loading, retryCount, manualRetry, maxRetry } =
    useImageLoader(imageUrl);

  const handleDelete = useCallback(
    async (fname: string) => {
      await photoboothApi.deletePoster(fname);
      setUserName(null);
      setStatements(null);
      setFilename('');
      setStage(0);
    },
    [setFilename, setStage, setStatements, setUserName],
  );

  const handleSend = () => setIsSending((prev) => !prev);
  const handlePublish = () => setStage(0);

  if (stage !== thisStage || !imageUrl || !filename) return null;

  const buttonStyles = `${boothBtn} mx-10 mt-5`;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black_bg">
      <div className="w-4/5">
        {loading && <Skeleton className="h-full w-full bg-slate-100 dark:bg-black" />}
        {error && (
          <div className="text-red-500">
            <p>Error: {error.message}</p>
          </div>
        )}
        {!loading && !error && (
          <img
            src={imageUrl}
            alt="User made poster"
            width={(windowHeight * canvasRatio) / 2}
            height={windowHeight / 2}
            onLoad={handleLoad}
            onError={handleError}
            className="mx-auto"
          />
        )}
        {error && retryCount === maxRetry && (
          <div>
            <p className="mx-auto text-white">Failed to load image. Please try again.</p>
            <Button className={`${editButton} mx-auto`} onClick={manualRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>
      <div>
        <Button className={buttonStyles} onClick={() => handleDelete(filename)}>
          Delete & Start Again
        </Button>
        <Button className={buttonStyles} onClick={handlePublish}>
          Publish
        </Button>
        <Button className={buttonStyles} onClick={handleSend}>
          Publish & Send by Email
        </Button>
      </div>
      <EmailForm
        fileName={filename}
        location={location}
        imageUrl={imageUrl}
        isSending={isSending}
      />
    </div>
  );
};

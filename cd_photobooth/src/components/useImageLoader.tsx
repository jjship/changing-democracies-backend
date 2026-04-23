import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';

const fetchImage = async (src: string) => {
  const res = await fetch(src);
  if (!res.ok) {
    const error = Object.assign(new Error('Error loading image'), { status: res.status });
    throw error;
  }
  return src;
};

export const useImageLoader = (src: string | null) => {
  const maxRetry = 5;
  const { data, error, mutate } = useSWR(src, fetchImage, {
    revalidateOnFocus: false,
    refreshInterval: 30000,
  });

  const [retryCount, setRetryCount] = useState(0);
  const [localError, setLocalError] = useState<Error | null>(null);

  const reloadImage = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setLocalError(null);
    mutate();
  }, [mutate]);

  const manualRetry = useCallback(() => {
    setRetryCount(0);
    setLocalError(null);
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (error && retryCount < maxRetry) {
      const retryDelay = Math.min(500 * Math.pow(2, retryCount), 2000);
      const timer = setTimeout(() => {
        reloadImage();
      }, retryDelay);
      return () => clearTimeout(timer);
    } else if (error && retryCount >= maxRetry) {
      setLocalError(error as Error);
    }
  }, [error, retryCount, reloadImage]);

  useEffect(() => {
    if (src) {
      reloadImage();
    }
  }, [src, reloadImage]);

  return {
    imageSrc: data,
    handleError: () => setLocalError(new Error('Error loading image')),
    handleLoad: () => mutate(),
    error: localError,
    loading: !data && !localError,
    retryCount,
    manualRetry,
    maxRetry,
  };
};

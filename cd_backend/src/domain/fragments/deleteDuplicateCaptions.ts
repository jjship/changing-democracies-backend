import { FastifyBaseLogger } from 'fastify';
import { BunnyStreamApiClient } from '../../services/bunnyStream/bunnyStreamApiClient';

const OPERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Helper to create a timeout promise
const createTimeout = (ms: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms));

export async function deleteDuplicateCaptions({
  bunnyStream,
  logger,
  dryRun = true,
}: {
  bunnyStream: BunnyStreamApiClient;
  logger: FastifyBaseLogger;
  dryRun?: boolean;
}) {
  const deletedCaptions: Array<{ videoId: string; deletedCaptions: string[] }> = [];
  const opLogger = logger.child({ module: 'delete-duplicate-captions', dryRun });

  try {
    // Add a global timeout to the entire operation
    await Promise.race([
      (async () => {
        opLogger.info('Starting duplicate captions deletion process');

        let bunnyVideos;
        try {
          opLogger.info('Fetching videos from Bunny Stream');
          bunnyVideos = await bunnyStream.getVideos();
          opLogger.info({ videoCount: bunnyVideos.length }, 'Successfully fetched videos from Bunny Stream');
        } catch (err) {
          opLogger.error({ err }, 'Failed to fetch videos from Bunny Stream. Operation aborted.');
          return deletedCaptions; // Return empty results but don't crash
        }

        // If we didn't get any videos, log it but don't crash
        if (!bunnyVideos || bunnyVideos.length === 0) {
          opLogger.warn('No videos fetched from Bunny Stream. Operation aborted.');
          return deletedCaptions;
        }

        // Process only a reasonable number of videos at a time to prevent resource exhaustion
        const MAX_VIDEOS_TO_PROCESS = 500;
        const videosToProcess = bunnyVideos.slice(0, MAX_VIDEOS_TO_PROCESS);

        if (videosToProcess.length < bunnyVideos.length) {
          opLogger.warn(
            {
              totalVideos: bunnyVideos.length,
              processedVideos: videosToProcess.length,
            },
            'Limited the number of videos to process to prevent resource exhaustion'
          );
        }

        for (const video of videosToProcess) {
          try {
            // Skip videos with no captions
            if (!video.captions || !Array.isArray(video.captions) || video.captions.length <= 1) {
              continue;
            }

            // Group captions by label
            const captionsByLabel = video.captions.reduce(
              (acc, caption) => {
                if (!caption || !caption.label) {
                  return acc;
                }
                acc[caption.label] = [...(acc[caption.label] || []), caption];
                return acc;
              },
              {} as Record<string, typeof video.captions>
            );

            const videoDeletions: string[] = [];

            for (const labelGroup of Object.values(captionsByLabel)) {
              if (labelGroup.length > 1) {
                const autoCaption = labelGroup.find((c) => c.srclang && c.srclang.endsWith('-auto'));
                if (autoCaption) {
                  opLogger.warn({ videoId: video.guid, srclang: autoCaption.srclang }, 'Deleting duplicate caption');

                  if (!dryRun) {
                    try {
                      await bunnyStream.deleteVideoCaptions({ videoId: video.guid, srclang: autoCaption.srclang });
                      videoDeletions.push(autoCaption.srclang);
                    } catch (err) {
                      opLogger.error(
                        { err, videoId: video.guid, srclang: autoCaption.srclang },
                        'Failed to delete caption, continuing with other captions'
                      );
                      // Continue with other captions, don't abort the whole operation
                    }
                  } else {
                    // In dry run mode, pretend we deleted it
                    videoDeletions.push(autoCaption.srclang);
                  }
                }
              }
            }

            if (videoDeletions.length > 0) {
              deletedCaptions.push({
                videoId: video.guid,
                deletedCaptions: videoDeletions,
              });
            }
          } catch (err) {
            // Log error for this video but continue with others
            opLogger.error(
              { err, videoId: video.guid },
              'Error processing video for duplicate captions, continuing with other videos'
            );
          }
        }

        opLogger.info(
          {
            videosProcessed: videosToProcess.length,
            videosWithDeletedCaptions: deletedCaptions.length,
            totalCaptionsDeleted: deletedCaptions.reduce((total, item) => total + item.deletedCaptions.length, 0),
            dryRun,
          },
          dryRun ? 'Dry run completed' : 'Successfully deleted duplicate captions'
        );
      })(),
      createTimeout(OPERATION_TIMEOUT_MS),
    ]);
  } catch (err) {
    // Handle timeout or other errors
    if ((err as Error).message.includes('timed out')) {
      opLogger.error(
        { err, captionsProcessed: deletedCaptions.length },
        'Global timeout reached during duplicate captions deletion'
      );
    } else {
      opLogger.error(
        { err, captionsProcessed: deletedCaptions.length },
        'Error during duplicate captions deletion process'
      );
    }
    // We still return partial results rather than throwing
  }

  return deletedCaptions;
}

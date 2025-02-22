import { FastifyBaseLogger } from 'fastify';
import { BunnyStreamApiClient } from '../../services/bunnyStream/bunnyStreamApiClient';

export async function deleteDuplicateCaptions({
  bunnyStream,
  logger,
  dryRun = true,
}: {
  bunnyStream: BunnyStreamApiClient;
  logger: FastifyBaseLogger;
  dryRun?: boolean;
}) {
  const bunnyVideos = await bunnyStream.getVideos();
  const deletedCaptions: Array<{ videoId: string; deletedCaptions: string[] }> = [];

  for (const video of bunnyVideos) {
    // Group captions by label
    const captionsByLabel = video.captions.reduce(
      (acc, caption) => {
        acc[caption.label] = [...(acc[caption.label] || []), caption];
        return acc;
      },
      {} as Record<string, typeof video.captions>
    );

    const videoDeletions: string[] = [];

    for (const labelGroup of Object.values(captionsByLabel)) {
      if (labelGroup.length > 1) {
        const autoCaption = labelGroup.find((c) => c.srclang.endsWith('-auto'));
        if (autoCaption) {
          logger.warn({ videoId: video.guid, srclang: autoCaption.srclang }, 'Deleting duplicate caption');

          if (!dryRun) {
            await bunnyStream.deleteVideoCaptions({ videoId: video.guid, srclang: autoCaption.srclang });
          }
          videoDeletions.push(autoCaption.srclang);
        }
      }
    }

    if (videoDeletions.length > 0) {
      deletedCaptions.push({
        videoId: video.guid,
        deletedCaptions: videoDeletions,
      });
    }
  }

  return deletedCaptions;
}

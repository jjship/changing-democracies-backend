import { expect } from 'chai';
import { serializeFilmsCollection } from './parseLegacyFragments';
import { BunnyVideo } from '../../services/bunnyStream/api/videos';

suite('serializeFilmsCollection', () => {
  test('should serialize an empty collection', () => {
    const result = serializeFilmsCollection({ videos: [] });
    expect(result).to.deep.equal({
      films: [],
      tags: [],
      countries: [],
      people: [],
    });
  });

  test('should serialize a collection with one video', () => {
    const videos: BunnyVideo[] = [
      {
        videoLibraryId: 1,
        guid: '123',
        title: 'CD_BELGIUM_Lisbeth Ruiz Sanchez_Quote 1.mp4',
        dateUploaded: '2023-01-01',
        views: 100,
        isPublic: true,
        length: 120,
        status: 1,
        framerate: 30,
        rotation: 0,
        width: 1920,
        height: 1080,
        availableResolutions: '1080p',
        thumbnailCount: 1,
        encodeProgress: 100,
        storageSize: 1000,
        captions: [],
        hasMP4Fallback: false,
        collectionId: '1',
        thumbnailFileName: 'thumbnail.jpg',
        averageWatchTime: 60,
        totalWatchTime: 6000,
        category: 'Test',
        chapters: [],
        moments: [],
        metaTags: [{ property: 'tags', value: 'tag1, tag2' }],
        transcodingMessages: [],
      },
    ];

    const result = serializeFilmsCollection({ videos });
    expect(result).to.deep.equal({
      films: [
        {
          country: 'BELGIUM',
          guid: '123',
          length: 120,
          person: 'Lisbeth Ruiz Sanchez',
          playerUrl: 'https://iframe.mediadelivery.net/embed/239326/123?autoplay=false',
          tags: ['tag1', 'tag2'],
          thumbnailUrl: 'https://vz-cac74041-8b3.b-cdn.net/123/thumbnail.jpg',
          title: 'CD_BELGIUM_Lisbeth Ruiz Sanchez_Quote 1.mp4',
        },
      ],
      tags: ['tag1', 'tag2'],
      countries: ['BELGIUM'],
      people: ['Lisbeth Ruiz Sanchez'],
    });
  });
});

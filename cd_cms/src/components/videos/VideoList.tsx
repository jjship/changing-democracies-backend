import { Box, Button, Center, Flex, Spinner, Tag, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react';
import { EnrichedVideo } from '../../api/videos';

export function VideoList({
  videos,
  isLoading,
  onEdit,
}: {
  videos: EnrichedVideo[];
  isLoading?: boolean;
  onEdit: (video: EnrichedVideo) => void;
}) {
  if (isLoading) {
    return (
      <Center py={10}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (videos.length === 0) {
    return (
      <Center py={10}>
        <Text color="gray.500">No videos match the current filters.</Text>
      </Center>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      {videos.map((video) => {
        const meta = [video.length, video.personName, video.country].filter(Boolean).join(' · ');
        return (
          <Flex
            key={video.guid}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            shadow="sm"
            alignItems="center"
            justifyContent="space-between"
            _hover={{ bg: 'gray.50' }}
          >
            <Box>
              <Text fontWeight="bold">{video.title}</Text>
              <Text fontSize="sm" color="gray.500">
                {meta}
              </Text>
              {video.captions.length > 0 && (
                <Wrap mt={2} spacing={1}>
                  {video.captions.map((caption) => (
                    <WrapItem key={caption.srclang}>
                      <Tag size="sm" colorScheme="blue">
                        {caption.srclang}
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              )}
            </Box>
            <Button colorScheme="blue" variant="outline" onClick={() => onEdit(video)}>
              Edit
            </Button>
          </Flex>
        );
      })}
    </VStack>
  );
}

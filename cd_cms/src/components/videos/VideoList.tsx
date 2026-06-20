import { Box, Button, Center, Flex, Spinner, Tag, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react';
import { Video } from '../../api/videos';

export function VideoList({
  videos,
  isLoading,
  onEdit,
}: {
  videos: Video[];
  isLoading?: boolean;
  onEdit: (video: Video) => void;
}) {
  if (isLoading) {
    return (
      <Center py={10}>
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      {videos.map((video) => (
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
              {video.length}
              {video.tags ? ` · ${video.tags}` : ''}
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
      ))}
    </VStack>
  );
}

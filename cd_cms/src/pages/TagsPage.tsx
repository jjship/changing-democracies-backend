import {
  Box,
  Button,
  VStack,
  useToast,
  Heading,
  FormControl,
  FormLabel,
  Input,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DeleteIcon, AddIcon } from '@chakra-ui/icons';
import { tagsApi } from '../api/tags';

const tagSchema = z.object({
  names: z
    .array(
      z.object({
        languageCode: z.string().min(2).max(2),
        name: z.string().min(1),
      })
    )
    .min(1),
});

type TagFormData = z.infer<typeof tagSchema>;

export function TagsPage() {
  const toast = useToast();
  const { register, control, handleSubmit, reset } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      names: [{ languageCode: 'EN', name: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'names',
  });

  const onSubmit = async (data: TagFormData) => {
    try {
      await tagsApi.create(data.names);
      toast({
        title: 'Tag created successfully',
        status: 'success',
      });
      reset();
    } catch (error) {
      toast({
        title: 'Failed to create tag',
        status: 'error',
      });
    }
  };

  return (
    <Box p={8}>
      <Heading mb={6}>Tag Management</Heading>

      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          {fields.map((field, index) => (
            <HStack key={field.id}>
              <FormControl>
                <FormLabel>Language Code</FormLabel>
                <Input {...register(`names.${index}.languageCode`)} placeholder="EN" maxLength={2} w="100px" />
              </FormControl>

              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input {...register(`names.${index}.name`)} placeholder="Tag name" />
              </FormControl>

              <IconButton
                aria-label="Remove language"
                icon={<DeleteIcon />}
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                alignSelf="flex-end"
              />
            </HStack>
          ))}

          <Button leftIcon={<AddIcon />} onClick={() => append({ languageCode: '', name: '' })} size="sm">
            Add Language
          </Button>

          <Button type="submit" colorScheme="blue">
            Create Tag
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

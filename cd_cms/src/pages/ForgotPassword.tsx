import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, FormControl, FormLabel, Input, VStack, Text, useToast, Container, Link, Heading } from '@chakra-ui/react';
import { authApi } from '../lib/auth';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      await authApi.requestPasswordReset(data.email);
      setSubmitted(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request a reset link',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={10}>
      <Box p={8} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
        <VStack spacing={4} align="stretch">
          <Heading size="md">Reset your password</Heading>

          {submitted ? (
            <Text>If an account exists for that address, a reset link has been sent. It is valid for one hour.</Text>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={4}>
                <FormControl isInvalid={!!errors.email}>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" autoComplete="username" {...register('email')} placeholder="Enter your email" />
                  {errors.email && (
                    <Text color="red.500" fontSize="sm">
                      {errors.email.message}
                    </Text>
                  )}
                </FormControl>

                <Button type="submit" colorScheme="blue" width="full" isLoading={isLoading}>
                  Send reset link
                </Button>
              </VStack>
            </form>
          )}

          <Link as={RouterLink} to="/login" color="blue.500" fontSize="sm">
            Back to sign in
          </Link>
        </VStack>
      </Box>
    </Container>
  );
}

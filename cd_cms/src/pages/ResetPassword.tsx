import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, FormControl, FormLabel, Input, VStack, Text, useToast, Container, Link, Heading } from '@chakra-ui/react';
import { authApi } from '../lib/auth';

const PASSWORD_MIN_LENGTH = 12;

const schema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof schema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    try {
      setIsLoading(true);
      await authApi.resetPassword(token, data.password);
      toast({
        title: 'Password set',
        description: 'You can now sign in with your new password.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set the password',
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
          <Heading size="md">Choose a new password</Heading>

          {!token ? (
            <Text>
              This link is missing its token.{' '}
              <Link as={RouterLink} to="/forgot-password" color="blue.500">
                Request a new one.
              </Link>
            </Text>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={4}>
                <FormControl isInvalid={!!errors.password}>
                  <FormLabel>New password</FormLabel>
                  <Input type="password" autoComplete="new-password" {...register('password')} />
                  {errors.password && (
                    <Text color="red.500" fontSize="sm">
                      {errors.password.message}
                    </Text>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.confirmPassword}>
                  <FormLabel>Confirm new password</FormLabel>
                  <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
                  {errors.confirmPassword && (
                    <Text color="red.500" fontSize="sm">
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </FormControl>

                <Button type="submit" colorScheme="blue" width="full" isLoading={isLoading}>
                  Set password
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

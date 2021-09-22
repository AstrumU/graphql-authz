import { GraphQLError } from 'graphql';
import { UnauthorizedError } from './rules';

export function processError(error: unknown): never {
  if (error instanceof UnauthorizedError) {
    throw new GraphQLError(
      error.message,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        code: 'FORBIDDEN'
      }
    );
  }
  throw new Error('Internal Server Error');
}

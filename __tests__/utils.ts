import { GraphQLResponse } from '@apollo/server';
import { FormattedExecutionResult } from 'graphql';

export function formatResponse(
  response: GraphQLResponse | undefined
): FormattedExecutionResult | undefined {
  return (
    (response &&
      'singleResult' in response.body &&
      response.body.singleResult) ||
    undefined
  );
}

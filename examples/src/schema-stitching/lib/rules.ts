import { GraphQLRequestContext } from 'apollo-server-plugin-base';
import { graphql } from 'graphql';
import {
  postExecRule,
  preExecRule,
  UnauthorizedError
} from '@astrumu/graphql-authz';

// authz rules
const IsAuthenticated = preExecRule({
  error: new UnauthorizedError('User is not authenticated')
})((requestContext: GraphQLRequestContext) => !!requestContext.context.user);

const IsAdmin = preExecRule({
  error: new UnauthorizedError('User is not admin')
})(async (requestContext: GraphQLRequestContext) => {
  const userId = requestContext.context.user?.id;

  if (!userId) {
    return false;
  }

  // query executable schema from rules
  const graphQLResult = await graphql({
    schema: requestContext.schema,
    source: `query user { user(id: ${String(userId)}) { role } }`
  });

  return graphQLResult.data?.user?.role === 'Admin';
});

const CanReadPost = postExecRule({
  error: new UnauthorizedError('Access denied'),
  selectionSet: '{ status author { id } }'
})(
  (
    requestContext: GraphQLRequestContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } }
  ) =>
    post.status === 'public' ||
    requestContext.context.user?.id === post.author.id
);

const CanPublishPost = preExecRule()(
  async (
    requestContext: GraphQLRequestContext,
    fieldArgs: { postId: string }
  ) => {
    const userId = requestContext.context.user?.id;

    if (!userId) {
      return false;
    }

    // query executable schema from rules
    const graphQLResult = await graphql({
      schema: requestContext.schema,
      source: `query post { post(id: ${fieldArgs.postId}) { author { id } } }`
    });

    return graphQLResult.data?.post.author.id === userId;
  }
);

export const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

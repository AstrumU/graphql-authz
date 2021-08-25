import { graphql, GraphQLSchema } from 'graphql';
import {
  postExecRule,
  preExecRule,
  UnauthorizedError
} from '@graphql-authz/core';

interface IContext {
  schema: GraphQLSchema;
  user?: {
    id: string;
  };
}

// authz rules
const IsAuthenticated = preExecRule({
  error: new UnauthorizedError('User is not authenticated')
})((context: IContext) => !!context.user);

const IsAdmin = preExecRule({
  error: new UnauthorizedError('User is not admin')
})(async (context: IContext) => {
  const userId = context.user?.id;

  if (!userId) {
    return false;
  }

  // query executable schema from rules
  const graphQLResult = await graphql({
    schema: context.schema,
    source: `query user { user(id: ${String(userId)}) { role } }`
  });

  return graphQLResult.data?.user?.role === 'Admin';
});

const CanReadPost = postExecRule({
  error: new UnauthorizedError('Access denied'),
  selectionSet: '{ status author { id } }'
})(
  (
    context: IContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } }
  ) => post.status === 'public' || context.user?.id === post.author.id
);

const CanPublishPost = preExecRule()(
  async (context: IContext, fieldArgs: { postId: string }) => {
    const userId = context.user?.id;

    if (!userId) {
      return false;
    }

    // query executable schema from rules
    const graphQLResult = await graphql({
      schema: context.schema,
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

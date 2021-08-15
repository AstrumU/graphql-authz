import { GraphQLRequestContext } from 'apollo-server-plugin-base';
import {
  postExecRule,
  preExecRule,
  UnauthorizedError
} from '@astrumu/graphql-authz';

import { posts, users } from './db';

const IsAuthenticated = preExecRule({
  error: new UnauthorizedError('User is not authenticated')
})((requestContext: GraphQLRequestContext) => !!requestContext.context.user);

const IsAdmin = preExecRule({
  error: new UnauthorizedError('User is not admin')
})(async (requestContext: GraphQLRequestContext) => {
  const { id: userId } = requestContext.context.user;

  if (!userId) {
    return false;
  }

  const user = await Promise.resolve(users.find(({ id }) => id === userId));

  return user?.role === 'Admin';
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

    const post = await Promise.resolve(
      posts.find(({ id }) => id === fieldArgs.postId)
    );

    return post?.authorId === userId;
  }
);

export const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

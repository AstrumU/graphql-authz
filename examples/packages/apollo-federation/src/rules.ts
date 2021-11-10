import { postExecRule, preExecRule } from '@graphql-authz/core';

import { posts, users } from './db';

interface IContext {
  user?: {
    id: string;
  };
}

const IsAuthenticated = preExecRule({
  error: 'User is not authenticated'
})((context: IContext) => !!context.user);

const IsAdmin = preExecRule({
  error: 'User is not admin'
})(async (context: IContext) => {
  const userId = context.user?.id;

  if (!userId) {
    return false;
  }

  const user = await Promise.resolve(users.find(({ id }) => id === userId));

  return user?.role === 'Admin';
});

const CanReadPost = postExecRule({
  error: 'Access denied',
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

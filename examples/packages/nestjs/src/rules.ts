import { postExecRule, preExecRule } from '@graphql-authz/core';
import { posts } from './db';

interface IContext {
  user?: {
    id: string;
    role: string;
  };
}

// authz rules
export const IsAuthenticated = preExecRule({
  error: 'User is not authenticated'
})((context: IContext) => !!context.user);

export const IsAdmin = preExecRule({
  error: 'User is not admin'
})((context: IContext) => context.user?.role === 'Admin');

export const CanReadPost = postExecRule({
  error: 'Access denied',
  selectionSet: '{ status author { id } }'
})(
  (
    context: IContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } }
  ) => post.status === 'public' || context.user?.id === post.author.id
);

export const CanPublishPost = preExecRule()(
  async (context: IContext, fieldArgs: { postId: string }) => {
    const post = await Promise.resolve(
      posts.find(({ id }) => id === fieldArgs.postId)
    );
    return !post || post.authorId === context.user?.id;
  }
);

export const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

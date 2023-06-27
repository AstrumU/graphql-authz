import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql';

import { Post, User } from './object';
import { AuthZ } from './decorator';
import { posts, users } from './db';

@Resolver(() => User)
export class UserResolver {
  @Query(() => [User])
  @AuthZ({ rules: ['IsAuthenticated'] })
  public users() {
    return users;
  }

  @ResolveField(() => [Post])
  public posts(@Parent() parent: { id: string }) {
    return posts.filter(({ id }) => id === parent.id);
  }
}

@Resolver(() => Post)
export class PostResolver {
  @Mutation(() => Post)
  @AuthZ({ rules: ['CanPublishPost'] })
  public publishPost(@Args({ name: 'postId', type: () => ID }) postId: string) {
    const post = posts.find(({ id }) => id === postId);
    if (!post) {
      throw new Error('Not Found');
    }
    post.status = 'public';
    return post;
  }

  @Query(() => [Post])
  public posts() {
    return posts;
  }

  @Query(() => Post)
  public post(@Args({ name: 'id', type: () => ID }) id: string) {
    return posts.find(post => post.id === id);
  }

  @ResolveField(() => User)
  public author(@Parent() parent: { authorId: string }) {
    return users.find(({ id }) => id === parent.authorId);
  }
}

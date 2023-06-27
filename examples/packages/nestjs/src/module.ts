import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GqlModuleOptions, GraphQLModule } from '@nestjs/graphql';

import { authZApolloPlugin } from '@graphql-authz/apollo-server-plugin';
import {
  authZDirective,
  authZGraphQLDirective
} from '@graphql-authz/directive';

import { users } from './db';
import { PostResolver, UserResolver } from './resolver';
import { authZRules } from './rules';

const { authZDirectiveTransformer } = authZDirective();

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      path: '/',
      driver: ApolloDriver,
      transformSchema: schema => authZDirectiveTransformer(schema),
      autoSchemaFile: true,
      context: ({ req }: GqlModuleOptions['context']) => ({
        user: users.find(({ id }) => id === req.get('x-user-id')) || null
      }),
      // authz apollo plugin
      plugins: [authZApolloPlugin({ rules: authZRules })],
      // authz directive visitor
      buildSchemaOptions: {
        // GraphQL directive
        directives: [authZGraphQLDirective(authZRules)]
      }
    })
  ],
  providers: [UserResolver, PostResolver]
})
export class AppModule {}

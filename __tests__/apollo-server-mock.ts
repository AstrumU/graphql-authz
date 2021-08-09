import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServer } from 'apollo-server';
import { GraphQLSchema, printSchema } from 'graphql';
import {
  authZApolloPlugin,
  authZDirective,
  authZGraphQLDirective,
  RulesObject
} from '../src';

const { authZDirectiveTransformer } = authZDirective();

export function apolloServerMock(
  rules: RulesObject,
  rawSchema: string,
  apolloServerConfig = {}
): ApolloServer {
  const plugin = authZApolloPlugin(rules);
  const directive = authZGraphQLDirective(rules);
  const directiveSchema = new GraphQLSchema({
    directives: [directive]
  });

  const typeDefs = `${printSchema(directiveSchema)}
        ${rawSchema}`;

  const schema = makeExecutableSchema({
    typeDefs
  });

  const transformedSchema = authZDirectiveTransformer(schema);

  return new ApolloServer({
    schema: transformedSchema,
    mocks: true,
    mockEntireSchema: true,
    plugins: [plugin],
    ...apolloServerConfig
  });
}

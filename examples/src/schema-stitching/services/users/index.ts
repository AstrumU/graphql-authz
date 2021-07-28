import { ApolloServer, gql } from 'apollo-server';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { makeExecutableSchema } from '@graphql-tools/schema';

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } =
  stitchingDirectives();

const typeDefs = gql`
  ${stitchingDirectivesTypeDefs}

  type User @key(selectionSet: "{ id }") {
    id: ID!
    username: String!
    email: String! @authz(rules: [IsAdmin])
    role: String!
  }

  type Query {
    users: [User!]! @authz(rules: [IsAuthenticated])
    user(id: ID!): User! @merge(keyField: "id")
    _sdl: String!
  }

  enum AuthZRules {
    IsAuthenticated
    IsAdmin
    CanReadPost
    CanPublishPost
  }

  # this is a common boilerplate
  input AuthZDirectiveCompositeRulesInput {
    and: [AuthZRules]
    or: [AuthZRules]
    not: AuthZRules
  }

  # this is a common boilerplate
  input AuthZDirectiveDeepCompositeRulesInput {
    id: AuthZRules
    and: [AuthZDirectiveDeepCompositeRulesInput]
    or: [AuthZDirectiveDeepCompositeRulesInput]
    not: AuthZDirectiveDeepCompositeRulesInput
  }

  # this is a common boilerplate
  directive @authz(
    rules: [AuthZRules]
    compositeRules: [AuthZDirectiveCompositeRulesInput]
    deepCompositeRules: [AuthZDirectiveDeepCompositeRulesInput]
  ) on FIELD_DEFINITION | OBJECT | INTERFACE
`;

const users = [
  {
    id: '1',
    username: 'user01',
    email: 'user01@gmail.com',
    role: 'Customer'
  },
  {
    id: '2',
    username: 'user02',
    email: 'user02@gmail.com',
    role: 'Admin'
  }
];

const resolvers = {
  Query: {
    users: () => users,
    user: (parent: unknown, args: { id: string }) =>
      users.find(({ id }) => id === args.id),
    _sdl: () => typeDefs.loc?.source.body
  }
};

const schema = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers
});

const server = new ApolloServer({
  schema
});

server.listen(4001).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});

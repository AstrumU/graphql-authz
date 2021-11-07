import { ApolloServer } from 'apollo-server';
import { getIntrospectionQuery } from 'graphql';
import { postExecRule } from '@graphql-authz/core';

import { mockServer } from './mock-server';

const rawSchema = `
type Query {
  test: Boolean!
}
`;

const rules = {
  TestRule: postExecRule()(() => false)
} as const;

const authSchema = {
  __Schema: {
    __authz: {
      rules: ['TestRule']
    }
  },
  __Type: {
    kind: {
      __authz: {
        rules: ['TestRule']
      }
    }
  }
};

jest.spyOn(rules.TestRule.prototype, 'execute');

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe('Introspection Query', () => {
      let server: ApolloServer;

      beforeAll(() => {
        server = mockServer({
          integrationMode,
          rules,
          rawSchema,
          rawSchemaWithoutDirectives: rawSchema,
          declarationMode: 'authSchema',
          authSchema
        });
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should be ignored', async () => {
        await server.executeOperation({
          query: getIntrospectionQuery()
        });

        expect(rules.TestRule.prototype.execute).not.toBeCalled();
      });
    });
  }
);

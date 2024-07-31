import { ApolloServer } from '@apollo/server';
import { PostExecutionRule } from '@graphql-authz/core';

import { mockServer } from '../mock-server';
import { formatResponse } from '../utils';

class Rule1 extends PostExecutionRule {
  public execute() {
    return;
  }
}

class Rule2 extends PostExecutionRule {
  public execute() {
    return;
  }
}

class Rule3 extends PostExecutionRule {
  public execute() {
    return;
  }
}

class Rule4 extends PostExecutionRule {
  public execute() {
    return;
  }
}

class RuleWithSelectionSet extends PostExecutionRule {
  public execute() {
    return;
  }

  public selectionSet = `{ testUnionWithSelectionSetQuery { ... on SubType1 { testField1 } } }`;
}

const rules = {
  Rule1,
  Rule2,
  Rule3,
  Rule4,
  RuleWithSelectionSet
} as const;

(Object.keys(rules) as Array<keyof typeof rules>).forEach(key => {
  jest.spyOn(rules[key].prototype, 'execute');
});

const rawSchema = `
interface TestInterface {
  testField1: String! @authz(rules: [Rule1])
}

union TestFieldUnion = SubType1 | SubType2

type SubType1 implements TestInterface {
  testField1: String!
  testField2: String! @authz(rules: [Rule2])
}

type SubType2 implements TestInterface {
  testField1: String!
  testField3: String! @authz(rules: [Rule3])
}

union TestTypeUnion = SubType3 | SubType4

type SubType3 @authz(rules: [Rule3]) {
  testFieldType3: String!
}

type SubType4 @authz(rules: [Rule4]) {
  testFieldType4: String!
}

type Query {
  testInterfaceQuery: [TestInterface!]!
  testFieldUnionQuery: [TestFieldUnion!]!
  testTypeUnionQuery: [TestTypeUnion!]!
  testUnionWithSelectionSetQuery: TestFieldUnion! @authz(rules: [RuleWithSelectionSet])
}
`;

const rawSchemaWithoutDirectives = `
interface TestInterface {
  testField1: String!
}

union TestFieldUnion = SubType1 | SubType2

type SubType1 implements TestInterface {
  testField1: String!
  testField2: String!
}

type SubType2 implements TestInterface {
  testField1: String!
  testField3: String!
}

union TestTypeUnion = SubType3 | SubType4

type SubType3 {
  testFieldType3: String!
}

type SubType4 {
  testFieldType4: String!
}

type Query {
  testInterfaceQuery: [TestInterface!]!
  testFieldUnionQuery: [TestFieldUnion!]!
  testTypeUnionQuery: [TestTypeUnion!]!
  testUnionWithSelectionSetQuery: TestFieldUnion!
}
`;

const testInterfaceQuery = `
  query test {
    testInterfaceQuery {
      testField1
      ... on SubType1 {
        testField2
      }
      ... on SubType2 {
        testField3
      }
    }
  }
`;

const testFieldUnionQuery = `
  query test {
    testFieldUnionQuery {
      ... on SubType1 {
        testField1
        testField2
      }
      ... on SubType2 {
        testField1
        testField3
      }
    }
  }
`;

const testTypeUnionQuery = `
  query test {
    testTypeUnionQuery {
      ... on SubType3 {
        testFieldType3
      }
      ... on SubType4 {
        testFieldType4
      }
    }
  }
`;

const testUnionWithSelectionSetQuery = `
  query test {
    testUnionWithSelectionSetQuery {
      ... on SubType1 {
        testField2
      }
    }
  }
`;

const authSchema = {
  Query: {
    testUnionWithSelectionSetQuery: {
      __authz: { rules: ['RuleWithSelectionSet'] }
    }
  },
  TestInterface: {
    testField1: { __authz: { rules: ['Rule1'] } }
  },
  SubType1: {
    testField2: { __authz: { rules: ['Rule2'] } }
  },
  SubType2: {
    testField3: { __authz: { rules: ['Rule3'] } }
  },
  SubType3: { __authz: { rules: ['Rule3'] } },
  SubType4: { __authz: { rules: ['Rule4'] } }
};

function __resolveType(obj: Record<string, unknown>) {
  if ('testField2' in obj) {
    return 'SubType1';
  }
  if ('testField3' in obj) {
    return 'SubType2';
  }
  if ('testFieldType3' in obj) {
    return 'SubType3';
  }
  if ('testFieldType3' in obj) {
    return 'SubType4';
  }
  return null;
}

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe.each(['directive', 'authSchema'] as const)(
      '%s',
      declarationMode => {
        describe('post execution rule', () => {
          let server: ApolloServer;

          beforeAll(() => {
            server = mockServer({
              integrationMode,
              rules,
              rawSchema,
              rawSchemaWithoutDirectives,
              declarationMode,
              authSchema,
              mocks: {
                Query: () => ({
                  testFieldUnionQuery: () => [
                    {
                      testField1: 'testField1Value',
                      testField2: 'testField2Value',
                      __typename: 'SubType1'
                    },
                    {
                      testField1: 'testField1Value',
                      testField3: 'testField3Value',
                      __typename: 'SubType2'
                    }
                  ],
                  testTypeUnionQuery: () => [
                    {
                      testFieldType3: 'testFieldType3Value1',
                      __typename: 'SubType3'
                    },
                    {
                      testFieldType3: 'testFieldType3Value2',
                      __typename: 'SubType3'
                    }
                  ],
                  testInterfaceQuery: () => [
                    {
                      testField1: 'testField1Value',
                      testField2: 'testField2Value',
                      __typename: 'SubType1'
                    },
                    {
                      testField1: 'testField1Value',
                      testField3: 'testField3Value',
                      __typename: 'SubType2'
                    }
                  ],
                  testUnionWithSelectionSetQuery: () => ({
                    testField1: 'testField1Value',
                    testField2: 'testField2Value',
                    __typename: 'SubType1'
                  })
                })
              },
              resolvers: {
                TestFieldUnion: {
                  __resolveType
                },
                TestInterface: {
                  __resolveType
                },
                TestTypeUnion: {
                  __resolveType
                }
              }
            });
          });

          afterEach(() => {
            jest.clearAllMocks();
          });

          it('should handle interfaces', async () => {
            await server.executeOperation({
              query: testInterfaceQuery
            });

            expect(Rule1.prototype.execute).toBeCalledTimes(2);
            expect(Rule2.prototype.execute).toBeCalledTimes(1);
            expect(Rule3.prototype.execute).toBeCalledTimes(1);
          });

          it('should handle unions with fields rules', async () => {
            await server.executeOperation({
              query: testFieldUnionQuery
            });

            expect(Rule2.prototype.execute).toBeCalledTimes(1);
            expect(Rule3.prototype.execute).toBeCalledTimes(1);
          });

          it('should handle unions with type rules processing only queried type rules', async () => {
            await server.executeOperation({
              query: testTypeUnionQuery
            });

            expect(Rule3.prototype.execute).toBeCalledTimes(1);
            expect(Rule4.prototype.execute).toBeCalledTimes(0);
          });

          it('should clean result', async () => {
            const result = formatResponse(
              await server.executeOperation({
                query: testUnionWithSelectionSetQuery
              })
            );

            expect(result?.data?.testUnionWithSelectionSetQuery).toBeDefined();

            expect(
              (result?.data?.testUnionWithSelectionSetQuery as any)?.testField1
            ).toBeUndefined();
          });
        });
      }
    );
  }
);

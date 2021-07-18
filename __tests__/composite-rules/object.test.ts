import { GraphQLSchema, printSchema } from 'graphql';
import { authZApolloPlugin, AuthZDirective, authZDirective } from '../../src';
import { ApolloServerMock } from '../apollo-server-mock';
import { inlineRules, rules } from './rules';

const rawSchema = `
  type FailingAndRuleObject @authz(rules: [FailingAndRule]) {
    id: ID!
  }

  type PassingAndRuleObject @authz(rules: [PassingAndRule]) {
    id: ID!
  }

  type FailingOrRuleObject @authz(rules: [FailingOrRule]) {
    id: ID!
  }

  type PassingOrRuleObject @authz(rules: [PassingOrRule]) {
    id: ID!
  }

  type FailingNotRuleObject @authz(rules: [FailingNotRule]) {
    id: ID!
  }

  type PassingNotRuleObject @authz(rules: [PassingNotRule]) {
    id: ID!
  }

  type FailingDeepAndRuleObject @authz(rules: [FailingDeepAndRule]) {
    id: ID!
  }

  type PassingDeepAndRuleObject @authz(rules: [PassingDeepAndRule]) {
    id: ID!
  }

  type FailingDeepOrRuleObject @authz(rules: [FailingDeepOrRule]) {
    id: ID!
  }

  type PassingDeepOrRuleObject @authz(rules: [PassingDeepOrRule]) {
    id: ID!
  }

  type FailingDeepNotRuleObject @authz(rules: [FailingDeepNotRule]) {
    id: ID!
  }

  type PassingDeepNotRuleObject @authz(rules: [PassingDeepNotRule]) {
    id: ID!
  }

  type FailingAndRuleInlineObject @authz(compositeRules: [${inlineRules.failingAndRuleInline}]) {
    id: ID!
  }

  type PassingAndRuleInlineObject @authz(compositeRules: [${inlineRules.passingAndRuleInline}]) {
    id: ID!
  }

  type FailingOrRuleInlineObject @authz(compositeRules: [${inlineRules.failingOrRuleInline}]) {
    id: ID!
  }

  type PassingOrRuleInlineObject @authz(compositeRules: [${inlineRules.passingOrRuleInline}]) {
    id: ID!
  }

  type FailingNotRuleInlineObject @authz(compositeRules: [${inlineRules.failingNotRuleInline}]) {
    id: ID!
  }

  type PassingNotRuleInlineObject @authz(compositeRules: [${inlineRules.passingNotRuleInline}]) {
    id: ID!
  }

  type FailingDeepAndRuleInlineObject @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}]) {
    id: ID!
  }

  type PassingDeepAndRuleInlineObject @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}]) {
    id: ID!
  }

  type FailingDeepOrRuleInlineObject @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}]) {
    id: ID!
  }

  type PassingDeepOrRuleInlineObject @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}]) {
    id: ID!
  }

  type FailingDeepNotRuleInlineObject @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}]) {
    id: ID!
  }

  type PassingDeepNotRuleInlineObject @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}]) {
    id: ID!
  }

  type Query {
    FailingAndRuleQuery: FailingAndRuleObject
    PassingAndRuleQuery: PassingAndRuleObject
    FailingOrRuleQuery: FailingOrRuleObject
    PassingOrRuleQuery: PassingOrRuleObject
    FailingNotRuleQuery: FailingNotRuleObject
    PassingNotRuleQuery: PassingNotRuleObject
    FailingDeepAndRuleQuery: FailingDeepAndRuleObject
    PassingDeepAndRuleQuery: PassingDeepAndRuleObject
    FailingDeepOrRuleQuery: FailingDeepOrRuleObject
    PassingDeepOrRuleQuery: PassingDeepOrRuleObject
    FailingDeepNotRuleQuery: FailingDeepNotRuleObject
    PassingDeepNotRuleQuery: PassingDeepNotRuleObject

    FailingAndRuleInlineQuery: FailingAndRuleInlineObject
    PassingAndRuleInlineQuery: PassingAndRuleInlineObject
    FailingOrRuleInlineQuery: FailingOrRuleInlineObject
    PassingOrRuleInlineQuery: PassingOrRuleInlineObject
    FailingNotRuleInlineQuery: FailingNotRuleInlineObject
    PassingNotRuleInlineQuery: PassingNotRuleInlineObject
    FailingDeepAndRuleInlineQuery: FailingDeepAndRuleInlineObject
    PassingDeepAndRuleInlineQuery: PassingDeepAndRuleInlineObject
    FailingDeepOrRuleInlineQuery: FailingDeepOrRuleInlineObject
    PassingDeepOrRuleInlineQuery: PassingDeepOrRuleInlineObject
    FailingDeepNotRuleInlineQuery: FailingDeepNotRuleInlineObject
    PassingDeepNotRuleInlineQuery: PassingDeepNotRuleInlineObject

    FailingAndRuleListQuery: [FailingAndRuleObject]
    PassingAndRuleListQuery: [PassingAndRuleObject]
    FailingOrRuleListQuery: [FailingOrRuleObject]
    PassingOrRuleListQuery: [PassingOrRuleObject]
    FailingNotRuleListQuery: [FailingNotRuleObject]
    PassingNotRuleListQuery: [PassingNotRuleObject]
    FailingDeepAndRuleListQuery: [FailingDeepAndRuleObject]
    PassingDeepAndRuleListQuery: [PassingDeepAndRuleObject]
    FailingDeepOrRuleListQuery: [FailingDeepOrRuleObject]
    PassingDeepOrRuleListQuery: [PassingDeepOrRuleObject]
    FailingDeepNotRuleListQuery: [FailingDeepNotRuleObject]
    PassingDeepNotRuleListQuery: [PassingDeepNotRuleObject]

    FailingAndRuleInlineListQuery: [FailingAndRuleInlineObject]
    PassingAndRuleInlineListQuery: [PassingAndRuleInlineObject]
    FailingOrRuleInlineListQuery: [FailingOrRuleInlineObject]
    PassingOrRuleInlineListQuery: [PassingOrRuleInlineObject]
    FailingNotRuleInlineListQuery: [FailingNotRuleInlineObject]
    PassingNotRuleInlineListQuery: [PassingNotRuleInlineObject]
    FailingDeepAndRuleInlineListQuery: [FailingDeepAndRuleInlineObject]
    PassingDeepAndRuleInlineListQuery: [PassingDeepAndRuleInlineObject]
    FailingDeepOrRuleInlineListQuery: [FailingDeepOrRuleInlineObject]
    PassingDeepOrRuleInlineListQuery: [PassingDeepOrRuleInlineObject]
    FailingDeepNotRuleInlineListQuery: [FailingDeepNotRuleInlineObject]
    PassingDeepNotRuleInlineListQuery: [PassingDeepNotRuleInlineObject]
  }
`;

describe('Composite rules', () => {
  let server: ApolloServerMock;
  let typeDefs: string;

  beforeAll(async () => {
    const plugin = authZApolloPlugin(rules);
    const directive = authZDirective(rules);
    const directiveSchema = new GraphQLSchema({
      directives: [directive]
    });

    typeDefs = `${printSchema(directiveSchema)}
        ${rawSchema}`;

    server = new ApolloServerMock({
      typeDefs,
      mocks: true,
      mockEntireSchema: true,
      plugins: [plugin],
      schemaDirectives: { authz: AuthZDirective }
    });
    await server.willStart();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    'FailingAndRule',
    'PassingAndRule',
    'FailingOrRule',
    'PassingOrRule',
    'FailingNotRule',
    'PassingNotRule',
    'FailingDeepAndRule',
    'PassingDeepAndRule',
    'FailingDeepOrRule',
    'PassingDeepOrRule',
    'FailingDeepNotRule',
    'PassingDeepNotRule'
  ])('%s', ruleName => {
    describe.each(['', 'Inline'])('%s', ruleVariant => {
      describe.each(['', 'List'])('%s', resultVariant => {
        it('should fail on failing rules and not fail on passing rules', async () => {
          let result;
          let error;
          try {
            result = await server.executeOperation({
              query: `query Test {
                      ${ruleName}${ruleVariant}${resultVariant}Query {
                        id
                      }
                    }`
            });
          } catch (e) {
            error = e;
          }

          if (ruleName.startsWith('Failing')) {
            const requestError = error || result?.errors?.[0];
            expect(requestError).toBeDefined();
            expect(requestError.extensions.code).toEqual('FORBIDDEN');
          } else {
            expect(result).toBeDefined();
            const queryResult =
              result?.data?.[`${ruleName}${ruleVariant}${resultVariant}Query`];
            expect(
              resultVariant === 'List' ? queryResult[0] : queryResult
            ).toHaveProperty('id');

            expect(
              typeof (resultVariant === 'List' ? queryResult[0] : queryResult)
                .id
            ).toEqual('string');
          }
        });
      });
    });
  });
});

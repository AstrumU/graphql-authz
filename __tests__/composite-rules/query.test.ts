import { GraphQLSchema, printSchema } from 'graphql';
import { authZApolloPlugin, AuthZDirective, authZDirective } from '../../src';
import { ApolloServerMock } from '../apollo-server-mock';
import { rules, inlineRules } from './rules';

const rawSchema = `
  type Query {
    FailingAndRuleQuery: String @authz(rules: [FailingAndRule])
    PassingAndRuleQuery: String @authz(rules: [PassingAndRule])
    FailingOrRuleQuery: String @authz(rules: [FailingOrRule])
    PassingOrRuleQuery: String @authz(rules: [PassingOrRule])
    FailingNotRuleQuery: String @authz(rules: [FailingNotRule])
    PassingNotRuleQuery: String @authz(rules: [PassingNotRule])
    FailingDeepAndRuleQuery: String @authz(rules: [FailingDeepAndRule])
    PassingDeepAndRuleQuery: String @authz(rules: [PassingDeepAndRule])
    FailingDeepOrRuleQuery: String @authz(rules: [FailingDeepOrRule])
    PassingDeepOrRuleQuery: String @authz(rules: [PassingDeepOrRule])
    FailingDeepNotRuleQuery: String @authz(rules: [FailingDeepNotRule])
    PassingDeepNotRuleQuery: String @authz(rules: [PassingDeepNotRule])

    FailingAndRuleInlineQuery: String @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    PassingAndRuleInlineQuery: String @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    FailingOrRuleInlineQuery: String @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    PassingOrRuleInlineQuery: String @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    FailingNotRuleInlineQuery: String @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    PassingNotRuleInlineQuery: String @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    FailingDeepAndRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    PassingDeepAndRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    FailingDeepOrRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    PassingDeepOrRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    FailingDeepNotRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    PassingDeepNotRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])

    FailingAndRuleListQuery: [String] @authz(rules: [FailingAndRule])
    PassingAndRuleListQuery: [String] @authz(rules: [PassingAndRule])
    FailingOrRuleListQuery: [String] @authz(rules: [FailingOrRule])
    PassingOrRuleListQuery: [String] @authz(rules: [PassingOrRule])
    FailingNotRuleListQuery: [String] @authz(rules: [FailingNotRule])
    PassingNotRuleListQuery: [String] @authz(rules: [PassingNotRule])
    FailingDeepAndRuleListQuery: [String] @authz(rules: [FailingDeepAndRule])
    PassingDeepAndRuleListQuery: [String] @authz(rules: [PassingDeepAndRule])
    FailingDeepOrRuleListQuery: [String] @authz(rules: [FailingDeepOrRule])
    PassingDeepOrRuleListQuery: [String] @authz(rules: [PassingDeepOrRule])
    FailingDeepNotRuleListQuery: [String] @authz(rules: [FailingDeepNotRule])
    PassingDeepNotRuleListQuery: [String] @authz(rules: [PassingDeepNotRule])
    FailingAndRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    PassingAndRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    FailingOrRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    PassingOrRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    FailingNotRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    PassingNotRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    FailingDeepAndRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    PassingDeepAndRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    FailingDeepOrRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    PassingDeepOrRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    FailingDeepNotRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    PassingDeepNotRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])
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
                      ${ruleName}${ruleVariant}${resultVariant}Query
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
              typeof (resultVariant === 'List' ? queryResult[0] : queryResult)
            ).toEqual('string');
          }
        });
      });
    });
  });
});

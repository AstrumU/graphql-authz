import { InternalAuthSchema } from '../auth-schema';

describe('InternalAuthSchema', () => {
  it('extracts configuration for a type from correct schema if it is present', () => {
    const authSchema = new InternalAuthSchema('__authz', {
      '*': { __authz: { rules: ['Wildcard'] } },
      Query: { __authz: { rules: ['Query'] } },
      Mutation: {
        '*': { __authz: { rules: ['Mutation wildcard'] } }
      },
      User: { __authz: { rules: ['User'] } },
      Posts: {
        author: { __authz: { rules: ['Posts author'] } }
      }
    });

    expect(authSchema.getTypeRuleConfig('*')).toStrictEqual({
      rules: ['Wildcard']
    });
    expect(authSchema.getTypeRuleConfig('Query')).toStrictEqual({
      rules: ['Query']
    });
    expect(authSchema.getTypeRuleConfig('User')).toStrictEqual({
      rules: ['User']
    });

    expect(authSchema.getTypeRuleConfig('Mutation')).toBeUndefined();
    expect(authSchema.getTypeRuleConfig('Posts')).toBeUndefined();
  });

  it('extracts configuration for a type-field pair from correct schema if it is present', () => {
    const authSchema = new InternalAuthSchema('__authz', {
      '*': {
        author: { __authz: { rules: ['Wildcard author'] } }
      },
      Query: { __authz: { rules: ['Query'] } },
      Mutation: {
        '*': { __authz: { rules: ['Mutation wildcard'] } }
      },
      User: { __authz: { rules: ['User'] } },
      Posts: {
        author: { __authz: { rules: ['Posts author'] } }
      }
    });

    expect(authSchema.getFieldRuleConfig('*', 'author')).toStrictEqual({
      rules: ['Wildcard author']
    });
    expect(authSchema.getFieldRuleConfig('*', 'reader')).toBeUndefined();

    expect(authSchema.getFieldRuleConfig('Query', '*')).toBeUndefined();
    expect(authSchema.getFieldRuleConfig('Query', 'author')).toBeUndefined();

    expect(authSchema.getFieldRuleConfig('Mutation', '*')).toStrictEqual({
      rules: ['Mutation wildcard']
    });
    expect(authSchema.getFieldRuleConfig('Mutation', 'author')).toBeUndefined();

    expect(authSchema.getFieldRuleConfig('User', '*')).toBeUndefined();
    expect(authSchema.getFieldRuleConfig('User', 'reader')).toBeUndefined();

    expect(authSchema.getFieldRuleConfig('Posts', '*')).toBeUndefined();
    expect(authSchema.getFieldRuleConfig('Posts', 'author')).toStrictEqual({
      rules: ['Posts author']
    });
  });

  it('extracts ALL declared configurations provided in schema', () => {
    const authSchema = new InternalAuthSchema('__authz', {
      '*': {
        author: { __authz: { rules: ['Wildcard author'] } }
      },
      Query: { __authz: { rules: ['Query'] } },
      Mutation: {
        '*': { __authz: { rules: ['Mutation wildcard'] } }
      },
      User: { __authz: { rules: ['User'] } },
      Posts: {
        author: { __authz: { rules: ['Posts author'] } }
      }
    });

    expect(authSchema.getAllRuleConfigs()).toStrictEqual([
      { rules: ['Wildcard author'] },
      { rules: ['Query'] },
      { rules: ['Mutation wildcard'] },
      { rules: ['User'] },
      { rules: ['Posts author'] }
    ]);
  });

  it('cannot extract elements from schema if wrapped in a wrong custom schema key', () => {
    const authSchema = new InternalAuthSchema('correctKey', {
      '*': {
        author: { correctKey: { rules: ['Wildcard author'] } }
      },
      Query: { correctKey: { rules: ['Query'] } },
      Mutation: {
        '*': { wrongKey: { rules: ['Mutation wildcard'] } }
      },
      User: { wrongKey: { rules: ['User'] } }
    });

    expect(authSchema.getTypeRuleConfig('User')).toBeUndefined();
    expect(authSchema.getFieldRuleConfig('Mutation', '*')).toBeUndefined();

    expect(authSchema.getTypeRuleConfig('Query')).toStrictEqual({
      rules: ['Query']
    });
    expect(authSchema.getFieldRuleConfig('*', 'author')).toStrictEqual({
      rules: ['Wildcard author']
    });

    expect(authSchema.getAllRuleConfigs()).toStrictEqual([
      { rules: ['Wildcard author'] },
      { rules: ['Query'] }
    ]);
  });
});

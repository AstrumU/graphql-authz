import _ from 'lodash';
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLInputObjectType,
  GraphQLList
} from 'graphql';

import { RulesObject } from './rules';

// TODO: implement directive validation
export function authZDirective(
  rules: RulesObject,
  directiveName = 'authz'
): GraphQLDirective {
  const RulesEnum = new GraphQLEnumType({
    name: 'AuthZRules',
    values: _.reduce<RulesObject, GraphQLEnumValueConfigMap>(
      rules,
      (result, rule, key) => {
        result[key] = { value: rule.name };
        return result;
      },
      {}
    )
  });

  const CompositeRulesInput = new GraphQLInputObjectType({
    name: 'AuthZDirectiveCompositeRulesInput',
    fields: {
      and: { type: new GraphQLList(RulesEnum) },
      or: { type: new GraphQLList(RulesEnum) },
      not: { type: RulesEnum }
    }
  });

  const DeepCompositeRulesInput: GraphQLInputObjectType =
    new GraphQLInputObjectType({
      name: 'AuthZDirectiveDeepCompositeRulesInput',
      fields: () => ({
        id: { type: RulesEnum },
        and: { type: new GraphQLList(DeepCompositeRulesInput) },
        or: { type: new GraphQLList(DeepCompositeRulesInput) },
        not: { type: DeepCompositeRulesInput }
      })
    });

  return new GraphQLDirective({
    name: directiveName,
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
      DirectiveLocation.OBJECT,
      DirectiveLocation.INTERFACE
    ],
    args: {
      rules: { type: new GraphQLList(RulesEnum) },
      compositeRules: { type: new GraphQLList(CompositeRulesInput) },
      deepCompositeRules: { type: new GraphQLList(DeepCompositeRulesInput) }
    }
  });
}

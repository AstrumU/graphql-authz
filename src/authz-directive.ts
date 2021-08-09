import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLSchema,
  GraphQLObjectType
} from 'graphql';
import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';

import { RulesObject } from './rules';
import { IAuthConfig } from './auth-config';

export interface IExtensionsDirective<
  TRules extends RulesObject = RulesObject
> {
  name: string;
  arguments: IAuthConfig<TRules>;
}

// TODO: implement directive validation
export function authZGraphQLDirective(
  rules: RulesObject,
  directiveName = 'authz'
): GraphQLDirective {
  const RulesEnum = new GraphQLEnumType({
    name: 'AuthZRules',
    values: Object.keys(rules).reduce<GraphQLEnumValueConfigMap>(
      (result, key) => {
        result[key] = { value: rules[key].name };
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

type SchemaItem =
  | GraphQLFieldConfig<unknown, unknown>
  | GraphQLObjectType
  | GraphQLInterfaceType;

export function authZDirective(directiveName = 'authz'): {
  authZDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema;
} {
  function addAuthZExtensionsDirective<T extends SchemaItem>(
    schema: GraphQLSchema,
    schemaItem: T
  ): T | undefined {
    const authZDirectiveArgs = getDirective(
      schema,
      schemaItem,
      directiveName
    )?.[0];

    if (!authZDirectiveArgs) {
      return undefined;
    }

    schemaItem.extensions = {
      ...schemaItem.extensions,
      authz: {
        ...schemaItem.extensions?.authz,
        directives: [
          ...(schemaItem.extensions?.authz?.directives || []),
          {
            name: directiveName,
            arguments: authZDirectiveArgs
          }
        ]
      }
    };
    return schemaItem;
  }
  return {
    authZDirectiveTransformer: schema =>
      mapSchema(schema, {
        [MapperKind.INTERFACE_FIELD]: fieldConfig =>
          addAuthZExtensionsDirective(schema, fieldConfig),
        [MapperKind.OBJECT_FIELD]: fieldConfig =>
          addAuthZExtensionsDirective(schema, fieldConfig),
        [MapperKind.OBJECT_TYPE]: type =>
          addAuthZExtensionsDirective(schema, type),
        [MapperKind.INTERFACE_TYPE]: type =>
          addAuthZExtensionsDirective(schema, type)
      })
  };
}

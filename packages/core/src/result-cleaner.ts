import {
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLSchema,
  TypeInfo,
  visitWithTypeInfo,
  visit,
  GraphQLOutputType
} from 'graphql';

import { isLeafTypeDeep } from './graphql-utils';
import { ResultInfo } from './result-info';
import { visitWithResultInfo } from './visit-with-result-info';

function shouldWriteToResult(
  value: unknown,
  type: GraphQLOutputType | null | undefined
): boolean {
  if (typeof value === 'object') {
    // includes null
    return !(value && Object.keys(value).length);
  }

  if (Array.isArray(value)) {
    return !value.length;
  }

  if (type && isLeafTypeDeep(type)) {
    return true;
  }

  return false;
}

// TODO: replace it with graphql call?
export function cleanupResult(
  ast: DocumentNode,
  schema: GraphQLSchema,
  fragmentDefinitions: FragmentDefinitionNode[],
  variables: Record<string, unknown>,
  data: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const typeInfo = new TypeInfo(schema);
  const resultInfo = new ResultInfo(data);
  const visitor = visitWithTypeInfo(
    typeInfo,
    visitWithResultInfo(
      resultInfo,
      typeInfo,
      fragmentDefinitions,
      variables,
      (resultInfo: ResultInfo, typeInfo: TypeInfo) => {
        const type = typeInfo.getType();
        const value = resultInfo.getValue();
        if (shouldWriteToResult(value, type)) {
          const parentStack = resultInfo.getFullParentStack();

          parentStack.reduce<any>((res, pathItem, index) => {
            const nextPathItem = parentStack[index + 1];

            if (nextPathItem !== undefined) {
              if (res[pathItem] === undefined) {
                res[pathItem] = typeof nextPathItem === 'string' ? {} : [];
              }
            } else {
              res[pathItem] = value;
            }

            return res[pathItem];
          }, result);
        }
      }
    )
  );

  visit(ast, visitor);

  return result;
}

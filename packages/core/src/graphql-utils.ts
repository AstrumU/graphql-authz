import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  getDirectiveValues,
  GraphQLIncludeDirective,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSkipDirective,
  GraphQLType,
  InlineFragmentNode,
  isListType,
  Kind,
  isLeafType,
  GraphQLSchema,
  GraphQLDirective,
  printSchema
} from 'graphql';
import isNil from 'lodash.isnil'

type WrappedType = GraphQLList<any> | GraphQLNonNull<any>; // eslint-disable-line
type DeepType = Exclude<GraphQLType, WrappedType>;

export function isWrappedType(type: GraphQLType): type is WrappedType {
  return !!('ofType' in type && type.ofType);
}

export function getListTypeDepth(
  type: GraphQLType | null | undefined,
  initialDepth = 0
): number {
  let depth = initialDepth;
  if (!type) {
    return depth;
  }

  if (isListType(type)) {
    depth++;
  }

  if (isWrappedType(type)) {
    return getListTypeDepth(type.ofType, depth);
  }

  return depth;
}

export function getDeepType(type: GraphQLType): DeepType {
  if (isWrappedType(type)) {
    return getDeepType(type.ofType);
  }
  return type;
}

export function isLeafTypeDeep(type: GraphQLType): boolean {
  const deepType = getDeepType(type);
  return isLeafType(deepType);
}

export function getNodeAliasOrName(node: FieldNode): string {
  return (node.alias?.kind === 'Name' && node.alias.value) || node.name.value;
}

export function getFilteredDocument(
  document: DocumentNode,
  operationName?: string | null
): DocumentNode {
  if (isNil(operationName)) {
    return document;
  }

  // by default, definitions contains all queries, mutations, fragments of the document
  // TODO: throw Error if there are no definitions matched with operationName?
  // there can be anonymous definitions without name
  // introspection query from graphql-codegen has no operationName at all
  const filteredDefinitions = document.definitions.filter(definition => (
    (definition.kind !== 'OperationDefinition') ||
    (definition.name?.value === operationName)
  ))
  return {
    ...document,
    definitions: filteredDefinitions
  };
}

export function getFragmentDefinitions(
  document: DocumentNode
): FragmentDefinitionNode[] {
  return document.definitions.filter<FragmentDefinitionNode>(
    (node): node is FragmentDefinitionNode =>
      node.kind === Kind.FRAGMENT_DEFINITION
  );
}

/**
 * // TODO: create an issue for exporting this function
 * Copied from graphql-js.
 * Determines if a field should be included based on the @include and @skip
 * directives, where @skip has higher precedence than @include.
 */
export function shouldIncludeNode(
  exeContext: { variableValues: Record<string, unknown> },
  node: FragmentSpreadNode | FieldNode | InlineFragmentNode
): boolean {
  const skip = getDirectiveValues(
    GraphQLSkipDirective,
    node,
    exeContext.variableValues
  );
  if (skip?.if === true) {
    return false;
  }

  const include = getDirectiveValues(
    GraphQLIncludeDirective,
    node,
    exeContext.variableValues
  );
  if (include?.if === false) {
    return false;
  }
  return true;
}

export function directiveTypeDefs(directive: GraphQLDirective): string {
  const directiveSchema = new GraphQLSchema({
    directives: [directive]
  });
  return printSchema(directiveSchema);
}

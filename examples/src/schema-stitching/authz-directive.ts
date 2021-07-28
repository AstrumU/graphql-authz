import { AuthZDirectiveVisitor } from '@astrumu/graphql-authz';
import { SchemaDirectiveVisitorClass } from '@graphql-tools/utils';

// fix for type incompatibility of
// apollo-server -> graphql-tools@4 SchemaDirectiveVisitor vs @graphql-tools/utils SchemaDirectiveVisitor
// https://github.com/ardatan/graphql-tools/issues/1408
export const AuthZDirective =
  AuthZDirectiveVisitor as unknown as SchemaDirectiveVisitorClass;

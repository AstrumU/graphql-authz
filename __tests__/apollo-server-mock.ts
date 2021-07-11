import { ApolloServerBase } from 'apollo-server-core';

export class ApolloServerMock extends ApolloServerBase {
  public async willStart(): Promise<void> {
    return super.willStart();
  }
}

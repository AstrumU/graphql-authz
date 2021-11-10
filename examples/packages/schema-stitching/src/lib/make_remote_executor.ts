import { fetch } from 'cross-fetch';
import { ASTNode, print } from 'graphql';

export function makeRemoteExecutor(url: string) {
  return async ({
    document,
    variables
  }: {
    document: string | ASTNode;
    variables?: unknown;
  }): Promise<any> => {
    const query = typeof document === 'string' ? document : print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });
    return fetchResult.json();
  };
}

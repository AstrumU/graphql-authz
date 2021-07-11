import _ from 'lodash';

export class ResultInfo {
  private parentStack: Array<string | number> = [];

  constructor(
    private result: unknown,
    private initialPathFromRoot: string = ''
  ) {}

  public getValue(): unknown {
    if (!this.parentStack.length) {
      return this.result;
    }
    return _.get(this.result, this.parentStack);
  }

  public getParentValue(): unknown {
    if (this.parentStack.length === 0) {
      return null;
    }
    if (this.parentStack.length === 1) {
      return this.result;
    }
    return _.get(this.result, _.initial(this.parentStack));
  }

  public getKey(): string | number | undefined {
    return _.last(this.parentStack);
  }

  public getPathFromRoot(): string {
    const path = this.parentStack.join('.');
    if (!this.initialPathFromRoot) {
      return path;
    }
    return `${this.initialPathFromRoot}.${path}`;
  }

  public enter(path: string | number): void {
    this.parentStack.push(path);
  }

  public leave(): string | number | undefined {
    return this.parentStack.pop();
  }
}

export class ResultInfo {
  private parentStack: Array<string | number> = [];

  constructor(
    private result: unknown,
    private initialParentStack: Array<string | number> = []
  ) {}

  private getValueByParentStack(parentStack: Array<string | number> = []) {
    return parentStack.reduce<any>(
      (res, pathItem) =>
        [undefined, null].includes(res) ? undefined : res[pathItem],
      this.result
    );
  }

  public getValue(): unknown {
    return this.getValueByParentStack(this.parentStack);
  }

  public getParentValue(): unknown {
    if (this.parentStack.length === 0) {
      return null;
    }
    return this.getValueByParentStack(this.parentStack.slice(0, -1));
  }

  public getKey(): string | number | undefined {
    return this.parentStack[this.parentStack.length - 1];
  }

  public getPathFromRoot(): string {
    const path = this.parentStack.join('.');
    if (!this.initialParentStack.length) {
      return path;
    }
    const initialPath = this.initialParentStack.join('.');
    return [initialPath, path].join('.');
  }

  public getFullParentStack(): Array<string | number> {
    return [...this.initialParentStack, ...this.parentStack];
  }

  public enter(path: string | number): void {
    this.parentStack.push(path);
  }

  public leave(): string | number | undefined {
    return this.parentStack.pop();
  }
}

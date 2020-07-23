export interface ICommonJsModuleSystem {
  /**
   * Map of file path to a loaded module.
   */
  loadedModules: Map<string, IModule>;

  /**
   * Require a module using an absolute file path.
   */
  requireModule(filePath: string): unknown;

  /**
   * Require a module from some context (directory path).
   */
  requireFrom(contextPath: string, request: string): unknown;

  /**
   * Resolve a module request from some context (directory path).
   *
   * @returns resolved path, or `undefined` if cannot resolve.
   */
  resolveFrom(contextPath: string, request: string, requestOrigin?: string): string | false | undefined;
}

export interface IModule {
  /**
   * Absolute path to module's source file.
   */
  id: string;

  /**
   * Absolute path to module's source file.
   */
  filename: string;

  /**
   * Exported values of module.
   */
  exports: unknown;
}

export type ModuleEvalFn = (
  module: IModule,
  exports: unknown,
  __filename: string,
  __dirname: string,
  process: {
    env: Record<string, string | undefined>;
  },
  require: (request: string) => unknown,
  global: unknown
) => void;

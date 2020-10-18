// eslint-disable-next-line no-var
declare var Error: ErrorConstructor;

// to avoid having to include @types/node just for this optional field
interface ErrorConstructor {
  stackTraceLimit?: number;
}

export default class DefaultError extends Error {
  public code: string = null;

  constructor(message: string, code: string, error?: Error) {
    super(message);

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    if (error && error.stack) {
      this.stack = `${this.stack}\n${error.stack.substring(error.stack.indexOf('\n') + 1)}`;
    }
    this.code = code;
  }
}

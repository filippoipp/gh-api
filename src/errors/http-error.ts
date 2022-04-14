import DefaultError from './default-error';

export default class HttpError extends DefaultError {
  public statusCode: number = null;

  public report: any = null;

  constructor(statusCode: number, errorCode: string, message: string, report: any, error?: Error) {
    super(message, errorCode, error);

    this.statusCode = statusCode;
    this.report = report;
  }
}

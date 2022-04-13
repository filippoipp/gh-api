import { NextFunction, Request, Response } from 'express';
import { AnySchema } from '@hapi/joi';
import HttpError from '../errors/http-error';

async function checkAndReturnValidationResult(schema: AnySchema, data: any, joiConfig = {}) {
  const { error, value: sanitizedData } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: true,
    ...joiConfig,
  });

  if (!error) {
    return sanitizedData;
  }

  const report = error.details.map((detail) => {
    const key = detail.path.join('.');
    const message = detail.message.replace(/['"]/g, '');
    return { [key]: message };
  });

  throw new HttpError(422, 'SERVER-422', 'Validation error', report);
}

const validateParams = (joiSchema: AnySchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params } = req;
    await checkAndReturnValidationResult(joiSchema, params, {
      stripUnknown: true,
    });
    req.params = params;
    next();
  } catch (err) {
    next(err);
  }
};

const validateBody = (joiSchema: AnySchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body } = req;
    await checkAndReturnValidationResult(joiSchema, body, {
      stripUnknown: true,
    });
    req.body = body;
    next();
  } catch (err) {
    next(err);
  }
};

export {
  validateBody, validateParams,
};

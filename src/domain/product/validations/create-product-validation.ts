import Joi from '@hapi/joi';

const createProductBody = {
  name: Joi.string().required(),
};

export default {
  body: Joi.object(createProductBody),
};

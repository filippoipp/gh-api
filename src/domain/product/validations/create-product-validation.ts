import Joi from '@hapi/joi';

const createProductBody = {
  name: Joi.string().required(),
  categoryId: Joi.string().required(),
  price: Joi.number().required(),
};

export default {
  body: Joi.object(createProductBody),
};

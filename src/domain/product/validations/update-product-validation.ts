import Joi from '@hapi/joi';

const updateProductBody = {
  name: Joi.string(),
  category_id: Joi.string(),
  price: Joi.number(),
};

const updateProductParams = {
  id: Joi.string().required(),
};

export default {
  body: Joi.object(updateProductBody),
  params: Joi.object(updateProductParams),
};

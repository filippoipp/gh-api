import Joi from '@hapi/joi';

const createCategoryBody = {
  name: Joi.string().required(),
};

export default {
  body: Joi.object(createCategoryBody),
};

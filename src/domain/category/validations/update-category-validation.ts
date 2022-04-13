import Joi from '@hapi/joi';

const updateCategoryBody = {
  name: Joi.string().required(),
};

const updateCategoryParams = {
  id: Joi.string().required(),
};

export default {
  body: Joi.object(updateCategoryBody),
  params: Joi.object(updateCategoryParams),
};

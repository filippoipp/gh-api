import Joi from '@hapi/joi';

const deleteCategoryParams = {
  id: Joi.string().required(),
};

export default {
  params: Joi.object(deleteCategoryParams),
};

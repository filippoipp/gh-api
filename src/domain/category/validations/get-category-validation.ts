import Joi from '@hapi/joi';

const getCategoryParams = {
  id: Joi.string().required(),
};

export default {
  params: Joi.object(getCategoryParams),
};

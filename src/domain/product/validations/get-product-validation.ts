import Joi from '@hapi/joi';

const getProductParams = {
  id: Joi.string().required(),
};

export default {
  params: Joi.object(getProductParams),
};

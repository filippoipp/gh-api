import Joi from '@hapi/joi';

const deleteProductParams = {
  id: Joi.string().required(),
};

export default {
  params: Joi.object(deleteProductParams),
};

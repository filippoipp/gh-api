import Joi from '@hapi/joi';

const createDeviceRequest = {
  keycloakTokenModel: Joi.object({
    applicationClientId: Joi.string().optional(),
    userId: Joi.alternatives().conditional('applicationClientId', {
      is: Joi.string().required(),
      then: Joi.string().optional(),
      otherwise: Joi.string().required().equal(Joi.ref('...params.id')),
    }),
  }).required(),
};

const createDevicePath = {
  id: Joi.string().required(),
};

const createDeviceBody = {
  description: Joi.string().required(),
  deviceKey: Joi.string().required(),
  otpKey: Joi.string().required(),
};

export default {
  request: Joi.object(createDeviceRequest),
  params: Joi.object(createDevicePath),
  body: Joi.object(createDeviceBody),
};

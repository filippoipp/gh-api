import { validateBody, validateParams } from 'src/middlewares/validation';
import productController from './controller/product-controller';
import validation from './validations/validation';

export default [
  {
    method: 'post',
    path: '/private/v1/product',
    handlers: [
      validateBody(validation.createProductBody),
      productController.create,
    ],
  },
  {
    method: 'delete',
    path: '/private/v1/product/:id',
    handlers: [
      validateParams(validation.deleteProductParams),
      productController.remove,
    ],
  },
  {
    method: 'patch',
    path: '/private/v1/product/:id',
    handlers: [
      validateBody(validation.updateProductBody),
      validateParams(validation.updateProductParams),
      productController.update,
    ],
  },
  {
    method: 'get',
    path: '/private/v1/product/:id',
    handlers: [
      validateParams(validation.getProductParams),
      productController.get,
    ],
  },
  {
    method: 'get',
    path: '/private/v1/product',
    handlers: [
      productController.getAll,
    ],
  },
];

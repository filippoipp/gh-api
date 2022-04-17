import { validateBody, validateParams } from 'src/middlewares/validation';
import multer from 'multer';
import multerConfig from '@config/multer-config';
import productController from './controller/product-controller';
import validation from './validations/validation';

const upload = multer(multerConfig);

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
    method: 'post',
    path: '/private/v1/product/import',
    handlers: [
      upload.any(),
      productController.importProducts,
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

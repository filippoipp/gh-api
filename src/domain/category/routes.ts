import { validateBody, validateParams } from 'src/middlewares/validation';
import multer from 'multer';
import multerConfig from '@config/multer-config';
import categoryController from './controller/category-controller';
import validation from './validations/validation';

const upload = multer(multerConfig);

export default [
  {
    method: 'post',
    path: '/private/v1/category',
    handlers: [
      validateBody(validation.createCategoryBody),
      categoryController.create,
    ],
  },
  {
    method: 'post',
    path: '/private/v1/category/import',
    handlers: [
      upload.any(),
      categoryController.importCategories,
    ],
  },
  {
    method: 'delete',
    path: '/private/v1/category/:id',
    handlers: [
      validateParams(validation.deleteCategoryParams),
      categoryController.remove,
    ],
  },
  {
    method: 'patch',
    path: '/private/v1/category/:id',
    handlers: [
      validateBody(validation.updateCategoryBody),
      validateParams(validation.updateCategoryParams),
      categoryController.update,
    ],
  },
  {
    method: 'get',
    path: '/private/v1/category/:id',
    handlers: [
      validateParams(validation.getCategoryParams),
      categoryController.get,
    ],
  },
  {
    method: 'get',
    path: '/private/v1/category',
    handlers: [
      categoryController.getAll,
    ],
  },
];

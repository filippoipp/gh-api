import { validateBody, validateParams } from 'src/middlewares/validation';
import categoryController from './controller/category-controller';
import validation from './validations/validation';

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

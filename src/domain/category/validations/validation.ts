import createCategoryValidation from './create-category-validation';
import deleteCategoryValidation from './delete-category-validation';
import getCategoryValidation from './get-category-validation';
import updateCategoryValidation from './update-category-validation';

export default {
  createCategoryBody: createCategoryValidation.body,
  deleteCategoryParams: deleteCategoryValidation.params,
  getCategoryParams: getCategoryValidation.params,
  updateCategoryBody: updateCategoryValidation.body,
  updateCategoryParams: updateCategoryValidation.params,
};

import createProductValidation from './create-product-validation';
import deleteProductValidation from './delete-product-validation';
import getProductValidation from './get-product-validation';
import updateProductValidation from './update-product-validation';

export default {
  createProductBody: createProductValidation.body,
  deleteProductParams: deleteProductValidation.params,
  getProductParams: getProductValidation.params,
  updateProductBody: updateProductValidation.body,
  updateProductParams: updateProductValidation.params,
};

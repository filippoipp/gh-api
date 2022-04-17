import HttpError from '@errors/http-error';
import { productErrorKeys, productErrorMessages } from '@errors/translator/product';
import ProductRepository from '../repositories/product-repository';

export default class ProductService {
  public async importProducts(file: any, categoryId: string): Promise<any> {
    try {
      const string = file.buffer.toString();
      const products = JSON.parse(string);
      const productRepository = new ProductRepository();
      await Promise.all(
        products.map(async (product) => {
          await productRepository.create({ ...product, categoryId });
        }),
      );
    } catch (error) {
      throw new HttpError(
        500,
        productErrorKeys.IMPORT_PRODUCTS_FAIL,
        productErrorMessages[productErrorKeys.IMPORT_PRODUCTS_FAIL],
        {},
      );
    }
  }
}

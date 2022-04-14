import HttpError from '@errors/http-error';
import { productErrorKeys, productErrorMessages } from '@errors/translator/product';
import { getRepository } from 'typeorm';
import Product from '../entities/product';

export default class ProductRepository {
  public async create(productData: any): Promise<any> {
    try {
      const productRepository = getRepository(Product);
      const product = await productRepository.save(productData);
      return product;
    } catch (error) {
      throw new HttpError(
        500,
        productErrorKeys.CREATE_PRODUCT_FAIL,
        productErrorMessages[productErrorKeys.CREATE_PRODUCT_FAIL],
        {},
      );
    }
  }

  public async remove(id: string): Promise<any> {
    try {
      const productRepository = getRepository(Product);
      await productRepository.delete(id);
    } catch (error) {
      throw new HttpError(
        500,
        productErrorKeys.DELETE_PRODUCT_FAIL,
        productErrorMessages[productErrorKeys.DELETE_PRODUCT_FAIL],
        {},
      );
    }
  }

  public async update(id: string, productData: any): Promise<any> {
    try {
      const productRepository = getRepository(Product);
      await productRepository.update(id, productData);
    } catch (error) {
      throw new HttpError(
        500,
        productErrorKeys.UPDATE_PRODUCT_FAIL,
        productErrorMessages[productErrorKeys.UPDATE_PRODUCT_FAIL],
        {},
      );
    }
  }

  public async get(id: string): Promise<any> {
    try {
      const productRepository = getRepository(Product);
      const product = await productRepository.findOne(id);
      return product;
    } catch (error) {
      throw new HttpError(
        500,
        productErrorKeys.GET_PRODUCT_FAIL,
        productErrorMessages[productErrorKeys.GET_PRODUCT_FAIL],
        {},
      );
    }
  }

  public async getAll(): Promise<any> {
    try {
      const productRepository = getRepository(Product);
      const products = await productRepository.find();
      return products;
    } catch (error) {
      throw new HttpError(
        500,
        productErrorKeys.GET_ALL_PRODUCTS_FAIL,
        productErrorMessages[productErrorKeys.GET_ALL_PRODUCTS_FAIL],
        {},
      );
    }
  }
}

import { repositoryMock } from '@mock/typeorm.mock';
import Product from '../entities/product';
import ProductRepository from './product-repository';

describe('Test product repository', () => {
  beforeEach(() => {
    repositoryMock.save.mockRestore();
    repositoryMock.delete.mockRestore();
  });

  test('Should return created product with success', async () => {
    const bodyMock = {
      name: 'any_name',
      categoryId: 'any_id',
      price: 10,
    };
    const productMock: Product = {
      name: bodyMock.name,
      categoryId: bodyMock.categoryId,
      price: bodyMock.price,
      id: 'any_id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repositoryMock.save.mockResolvedValue(productMock);

    const productRepository = new ProductRepository();
    const createdProduct = await productRepository.create(bodyMock);

    expect(repositoryMock.save).toBeCalledTimes(1);
    expect(repositoryMock.save).toBeCalledWith(bodyMock);
    expect(createdProduct).toEqual(productMock);
  });

  test('Should return error when call create with exception', async () => {
    const bodyMock = {
      name: 'any_name',
      categoryId: 'any_id',
      price: 10,
    };
    const mockError = new Error('Any Error.');
    repositoryMock.save.mockRejectedValue(mockError);

    try {
      const productRepository = new ProductRepository();
      await productRepository.create(bodyMock);
    } catch (error) {
      expect(repositoryMock.save).toBeCalledTimes(1);
      expect(repositoryMock.save).toBeCalledWith(bodyMock);
      expect(error.code).toEqual('PRODUCT-001');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should delete product with success', async () => {
    const id = 'any_id';
    const deletedProductMock = {
      raw: 'any',
      affected: 1,
    };

    repositoryMock.delete.mockResolvedValue(deletedProductMock);

    const productRepository = new ProductRepository();
    const deletedProduct = await productRepository.remove(id);

    expect(repositoryMock.delete).toBeCalledTimes(1);
    expect(repositoryMock.delete).toBeCalledWith(id);
    expect(deletedProduct).toEqual(undefined);
  });

  test('Should return error when call remove with exception', async () => {
    const id = 'any_id';
    const mockError = new Error('Any Error.');
    repositoryMock.delete.mockRejectedValue(mockError);

    try {
      const productRepository = new ProductRepository();
      await productRepository.remove(id);
    } catch (error) {
      expect(repositoryMock.delete).toBeCalledTimes(1);
      expect(repositoryMock.delete).toBeCalledWith(id);
      expect(error.code).toEqual('PRODUCT-002');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should return product with success', async () => {
    const id = 'any_id';
    const productMock = {
      name: 'any_name',
      id: 'any_id',
    };

    repositoryMock.findOne.mockResolvedValue(productMock);

    const productRepository = new ProductRepository();
    const product = await productRepository.get(id);

    expect(repositoryMock.findOne).toBeCalledTimes(1);
    expect(repositoryMock.findOne).toBeCalledWith(id, { relations: ['category'] });
    expect(product).toEqual(productMock);
  });

  test('Should return error when call get with exception', async () => {
    const id = 'any_id';
    const mockError = new Error('Any Error.');
    repositoryMock.findOne.mockRejectedValue(mockError);

    try {
      const productRepository = new ProductRepository();
      await productRepository.get(id);
    } catch (error) {
      expect(repositoryMock.findOne).toBeCalledTimes(1);
      expect(repositoryMock.findOne).toBeCalledWith(id, { relations: ['category'] });
      expect(error.code).toEqual('PRODUCT-004');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should return products with success', async () => {
    const productsMock = [{
      name: 'any_name',
      id: 'any_id',
    }];

    repositoryMock.find.mockResolvedValue(productsMock);

    const productRepository = new ProductRepository();
    const categories = await productRepository.getAll();

    expect(repositoryMock.find).toBeCalledTimes(1);
    expect(repositoryMock.find).toBeCalledWith({ relations: ['category'] });
    expect(categories).toEqual(productsMock);
  });

  test('Should return error when call getAll with exception', async () => {
    const mockError = new Error('Any Error.');
    repositoryMock.find.mockRejectedValue(mockError);

    try {
      const productRepository = new ProductRepository();
      await productRepository.getAll();
    } catch (error) {
      expect(repositoryMock.find).toBeCalledTimes(1);
      expect(repositoryMock.find).toBeCalledWith({ relations: ['category'] });
      expect(error.code).toEqual('PRODUCT-005');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should update with success', async () => {
    const id = 'any_id';
    const name = 'any_name';
    const updatedProductMock = {
      raw: 'any',
      affected: 1,
      generatedMaps: [],
    };

    repositoryMock.update.mockResolvedValue(updatedProductMock);

    const productRepository = new ProductRepository();
    await productRepository.update(id, { name });

    expect(repositoryMock.update).toBeCalledTimes(1);
    expect(repositoryMock.update).toBeCalledWith(id, { name });
  });

  test('Should return error when call update with exception', async () => {
    const id = 'any_id';
    const name = 'any_name';
    const mockError = new Error('Any Error.');
    repositoryMock.update.mockRejectedValue(mockError);

    try {
      const productRepository = new ProductRepository();
      await productRepository.update(id, { name });
    } catch (error) {
      expect(repositoryMock.update).toBeCalledTimes(1);
      expect(repositoryMock.update).toBeCalledWith(id, { name });
      expect(error.code).toEqual('PRODUCT-003');
      expect(error.statusCode).toEqual(500);
    }
  });
});

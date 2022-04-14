import { getMockReq, getMockRes } from '@jest-mock/express';
import ProductRepository from '../repositories/product-repository';
import productController from './product-controller';

jest.mock('../repositories/product-repository');

const ProductRepositoryMock = ProductRepository as jest.MockedClass<typeof ProductRepository>;

describe('Test product controller', () => {
  beforeEach(() => {
    ProductRepositoryMock.prototype.create.mockRestore();
    ProductRepositoryMock.prototype.get.mockRestore();
    ProductRepositoryMock.prototype.getAll.mockRestore();
    ProductRepositoryMock.prototype.remove.mockRestore();
  });

  test('Should response 201 when call create with success', async () => {
    const bodyMock = {
      name: 'any_name',
      category_id: 'any_id',
      price: 10,
    };

    const createdProductMock = {
      name: 'any_name',
      categoryId: 'any_id',
      price: 10,
      id: 'any_id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockRequest = getMockReq({
      body: bodyMock,
    });

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.create.mockResolvedValue(createdProductMock);

    await productController.create(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.create).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.create).toBeCalledWith(bodyMock);
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(201);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith(createdProductMock);
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('Should response error when call create with exception', async () => {
    const name = 'any_name';
    const mockRequest = getMockReq({
      body: {
        name,
      },
    });
    const mockError = new Error('Any Error.');

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.create.mockRejectedValue(mockError);

    await productController.create(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.create).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.create).toBeCalledWith({ name });
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });

  test('Should response 200 when call get with success', async () => {
    const id = 'any_id';
    const productMock = {
      name: 'any_name',
      categoryId: 'any_id',
      price: 10,
      id: 'any_id',
    };
    const mockRequest = getMockReq({
      params: {
        id,
      },
    });

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.get.mockResolvedValue(productMock);

    await productController.get(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.get).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.get).toBeCalledWith(id);
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(200);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith(productMock);
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('Should response error when call get with exception', async () => {
    const id = 'any_id';
    const mockRequest = getMockReq({
      params: {
        id,
      },
    });
    const mockError = new Error('Any Error.');

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.get.mockRejectedValue(mockError);

    await productController.get(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.get).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.get).toBeCalledWith(id);
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });

  test('Should response 200 when call getAll with success', async () => {
    const productMock = [{
      name: 'any_name',
      categoryId: 'any_id',
      id: 'any_id',
      price: 10,
    }];
    const mockRequest = getMockReq({});

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.getAll.mockResolvedValue(productMock);

    await productController.getAll(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.getAll).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.getAll).toBeCalledWith();
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(200);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith(productMock);
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('Should response error when call getAll with exception', async () => {
    const mockRequest = getMockReq({});
    const mockError = new Error('Any Error.');

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.getAll.mockRejectedValue(mockError);

    await productController.getAll(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.getAll).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.getAll).toBeCalledWith();
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });

  test('Should response 204 when call remove with success', async () => {
    const id = 'any_id';
    const mockRequest = getMockReq({
      params: {
        id,
      },
    });

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.remove.mockResolvedValue();

    await productController.remove(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.remove).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.remove).toBeCalledWith(id);
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(204);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith();
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('Should response error when call remove with exception', async () => {
    const id = 'any_id';
    const mockRequest = getMockReq({
      params: {
        id,
      },
    });
    const mockError = new Error('Any Error.');

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.remove.mockRejectedValue(mockError);

    await productController.remove(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.remove).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.remove).toBeCalledWith(id);
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });
  test('Should response 200 when call update with success', async () => {
    const id = 'any_id';
    const name = 'any_name';
    const mockRequest = getMockReq({
      params: {
        id,
      },
      body: {
        name,
      },
    });

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.update.mockResolvedValue();

    await productController.update(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.update).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.update).toBeCalledWith(id, { name });
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(200);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith({ message: 'Product updated' });
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('Should response error when call update with exception', async () => {
    const id = 'any_id';
    const name = 'any_name';
    const mockRequest = getMockReq({
      params: {
        id,
      },
      body: {
        name,
      },
    });
    const mockError = new Error('Any Error.');

    const { res, next } = getMockRes();

    ProductRepositoryMock.prototype.update.mockRejectedValue(mockError);

    await productController.update(mockRequest, res, next);

    expect(ProductRepositoryMock.prototype.update).toBeCalledTimes(1);
    expect(ProductRepositoryMock.prototype.update).toBeCalledWith(id, { name });
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });
});

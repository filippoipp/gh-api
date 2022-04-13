import { getMockReq, getMockRes } from '@jest-mock/express';
import CategoryRepository from '../repositories/category-repository';
import categoryController from './category-controller';

jest.mock('../repositories/category-repository');

const CategoryRepositoryMock = CategoryRepository as jest.MockedClass<typeof CategoryRepository>;

describe('Test category controller', () => {
  beforeEach(() => {
    CategoryRepositoryMock.prototype.create.mockRestore();
    CategoryRepositoryMock.prototype.get.mockRestore();
    CategoryRepositoryMock.prototype.getAll.mockRestore();
    CategoryRepositoryMock.prototype.remove.mockRestore();
  });

  test('Should response 201 when call create with success', async () => {
    const name = 'any_name';
    const createdCategoryMock = {
      name: 'any_name',
      id: 'any_id',
      createdAt: 'any_date',
      updatedAt: 'any_date',
    };
    const mockRequest = getMockReq({
      body: {
        name,
      },
    });

    const { res, next } = getMockRes();

    CategoryRepositoryMock.prototype.create.mockResolvedValue(createdCategoryMock);

    await categoryController.create(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.create).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.create).toBeCalledWith({ name });
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(201);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith(createdCategoryMock);
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

    CategoryRepositoryMock.prototype.create.mockRejectedValue(mockError);

    await categoryController.create(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.create).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.create).toBeCalledWith({ name });
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });

  test('Should response 200 when call get with success', async () => {
    const id = 'any_id';
    const categoryMock = {
      name: 'any_name',
      id: 'any_id',
    };
    const mockRequest = getMockReq({
      params: {
        id,
      },
    });

    const { res, next } = getMockRes();

    CategoryRepositoryMock.prototype.get.mockResolvedValue(categoryMock);

    await categoryController.get(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.get).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.get).toBeCalledWith(id);
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(200);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith(categoryMock);
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

    CategoryRepositoryMock.prototype.get.mockRejectedValue(mockError);

    await categoryController.get(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.get).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.get).toBeCalledWith(id);
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });

  test('Should response 200 when call getAll with success', async () => {
    const categoryMock = [{
      name: 'any_name',
      id: 'any_id',
    }];
    const mockRequest = getMockReq({});

    const { res, next } = getMockRes();

    CategoryRepositoryMock.prototype.getAll.mockResolvedValue(categoryMock);

    await categoryController.getAll(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.getAll).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.getAll).toBeCalledWith();
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(200);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith(categoryMock);
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('Should response error when call getAll with exception', async () => {
    const mockRequest = getMockReq({});
    const mockError = new Error('Any Error.');

    const { res, next } = getMockRes();

    CategoryRepositoryMock.prototype.getAll.mockRejectedValue(mockError);

    await categoryController.getAll(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.getAll).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.getAll).toBeCalledWith();
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

    CategoryRepositoryMock.prototype.remove.mockResolvedValue({});

    await categoryController.remove(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.remove).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.remove).toBeCalledWith(id);
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

    CategoryRepositoryMock.prototype.remove.mockRejectedValue(mockError);

    await categoryController.remove(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.remove).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.remove).toBeCalledWith(id);
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

    CategoryRepositoryMock.prototype.update.mockResolvedValue({ message: 'Category updated' });

    await categoryController.update(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.update).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.update).toBeCalledWith(id, { name });
    expect(res.status).toBeCalledTimes(1);
    expect(res.status).toBeCalledWith(200);
    expect(res.json).toBeCalledTimes(1);
    expect(res.json).toBeCalledWith({ message: 'Category updated' });
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

    CategoryRepositoryMock.prototype.update.mockRejectedValue(mockError);

    await categoryController.update(mockRequest, res, next);

    expect(CategoryRepositoryMock.prototype.update).toBeCalledTimes(1);
    expect(CategoryRepositoryMock.prototype.update).toBeCalledWith(id, { name });
    expect(res.status).not.toBeCalled();
    expect(res.json).not.toBeCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toBeCalledWith(mockError);
  });
});

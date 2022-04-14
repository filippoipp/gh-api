import { repositoryMock } from '@mock/typeorm.mock';
import Category from '../entities/category';
import CategoryRepository from './category-repository';

describe('Test category repository', () => {
  beforeEach(() => {
    repositoryMock.save.mockRestore();
    repositoryMock.delete.mockRestore();
  });

  test('Should return created category with success', async () => {
    const name = 'any_name';
    const categoryMock: Category = {
      name,
      id: 'any_id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repositoryMock.save.mockResolvedValue(categoryMock);

    const categoryRepository = new CategoryRepository();
    const createdCategory = await categoryRepository.create(name);

    expect(repositoryMock.save).toBeCalledTimes(1);
    expect(repositoryMock.save).toBeCalledWith(name);
    expect(createdCategory).toEqual(categoryMock);
  });

  test('Should return error when call create with exception', async () => {
    const name = 'any_name';
    const mockError = new Error('Any Error.');
    repositoryMock.save.mockRejectedValue(mockError);

    try {
      const categoryRepository = new CategoryRepository();
      await categoryRepository.create(name);
    } catch (error) {
      expect(repositoryMock.save).toBeCalledTimes(1);
      expect(repositoryMock.save).toBeCalledWith(name);
      expect(error.code).toEqual('CATEGORY-001');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should delete category with success', async () => {
    const id = 'any_id';
    const deletedCategoryMock = {
      raw: 'any',
      affected: 1,
    };

    repositoryMock.delete.mockResolvedValue(deletedCategoryMock);

    const categoryRepository = new CategoryRepository();
    const deletedCategory = await categoryRepository.remove(id);

    expect(repositoryMock.delete).toBeCalledTimes(1);
    expect(repositoryMock.delete).toBeCalledWith(id);
    expect(deletedCategory).toEqual(undefined);
  });

  test('Should return error when call remove with exception', async () => {
    const id = 'any_id';
    const mockError = new Error('Any Error.');
    repositoryMock.delete.mockRejectedValue(mockError);

    try {
      const categoryRepository = new CategoryRepository();
      await categoryRepository.remove(id);
    } catch (error) {
      expect(repositoryMock.delete).toBeCalledTimes(1);
      expect(repositoryMock.delete).toBeCalledWith(id);
      expect(error.code).toEqual('CATEGORY-002');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should return category with success', async () => {
    const id = 'any_id';
    const categoryMock = {
      name: 'any_name',
      id: 'any_id',
    };

    repositoryMock.findOne.mockResolvedValue(categoryMock);

    const categoryRepository = new CategoryRepository();
    const category = await categoryRepository.get(id);

    expect(repositoryMock.findOne).toBeCalledTimes(1);
    expect(repositoryMock.findOne).toBeCalledWith(id);
    expect(category).toEqual(categoryMock);
  });

  test('Should return error when call get with exception', async () => {
    const id = 'any_id';
    const mockError = new Error('Any Error.');
    repositoryMock.findOne.mockRejectedValue(mockError);

    try {
      const categoryRepository = new CategoryRepository();
      await categoryRepository.get(id);
    } catch (error) {
      expect(repositoryMock.findOne).toBeCalledTimes(1);
      expect(repositoryMock.findOne).toBeCalledWith(id);
      expect(error.code).toEqual('CATEGORY-004');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should return categories with success', async () => {
    const categoriesMock = [{
      name: 'any_name',
      id: 'any_id',
    }];

    repositoryMock.find.mockResolvedValue(categoriesMock);

    const categoryRepository = new CategoryRepository();
    const categories = await categoryRepository.getAll();

    expect(repositoryMock.find).toBeCalledTimes(1);
    expect(repositoryMock.find).toBeCalledWith();
    expect(categories).toEqual(categoriesMock);
  });

  test('Should return error when call getAll with exception', async () => {
    const mockError = new Error('Any Error.');
    repositoryMock.find.mockRejectedValue(mockError);

    try {
      const categoryRepository = new CategoryRepository();
      await categoryRepository.getAll();
    } catch (error) {
      expect(repositoryMock.find).toBeCalledTimes(1);
      expect(repositoryMock.find).toBeCalledWith();
      expect(error.code).toEqual('CATEGORY-005');
      expect(error.statusCode).toEqual(500);
    }
  });

  test('Should update with success', async () => {
    const id = 'any_id';
    const name = 'any_name';
    const updatedCategoryMock = {
      raw: 'any',
      affected: 1,
      generatedMaps: [],
    };

    repositoryMock.update.mockResolvedValue(updatedCategoryMock);

    const categoryRepository = new CategoryRepository();
    await categoryRepository.update(id, name);

    expect(repositoryMock.update).toBeCalledTimes(1);
    expect(repositoryMock.update).toBeCalledWith(id, name);
  });

  test('Should return error when call update with exception', async () => {
    const id = 'any_id';
    const name = 'any_name';
    const mockError = new Error('Any Error.');
    repositoryMock.update.mockRejectedValue(mockError);

    try {
      const categoryRepository = new CategoryRepository();
      await categoryRepository.update(id, name);
    } catch (error) {
      expect(repositoryMock.update).toBeCalledTimes(1);
      expect(repositoryMock.update).toBeCalledWith(id, name);
      expect(error.code).toEqual('CATEGORY-003');
      expect(error.statusCode).toEqual(500);
    }
  });
});

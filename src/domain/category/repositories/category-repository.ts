import HttpError from '@errors/http-error';
import { categoryErrorKeys, categoryErrorMessages } from '@errors/translator/category';
import { getRepository } from 'typeorm';
import Category from '../entities/category';
import CategoryData from '../interfaces/category-data';
import CreatedCategory from '../interfaces/created-category';
import GetCategory from '../interfaces/get-category';

export default class CategoryRepository {
  public async create(categoryData: CategoryData): Promise<CreatedCategory> {
    try {
      const categoryRepository = getRepository(Category);
      const category = await categoryRepository.save(categoryData);
      return category;
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.CREATE_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.CREATE_CATEGORY_FAIL],
        {},
      );
    }
  }

  public async remove(id: string): Promise<void> {
    try {
      const categoryRepository = getRepository(Category);
      await categoryRepository.delete(id);
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.DELETE_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.DELETE_CATEGORY_FAIL],
        {},
      );
    }
  }

  public async update(id: string, categoryData: CategoryData): Promise<void> {
    try {
      const categoryRepository = getRepository(Category);
      await categoryRepository.update(id, categoryData);
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.UPDATE_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.UPDATE_CATEGORY_FAIL],
        {},
      );
    }
  }

  public async get(id: string): Promise<GetCategory> {
    try {
      const categoryRepository = getRepository(Category);
      const category = await categoryRepository.findOne(id);
      return category;
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.GET_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.GET_CATEGORY_FAIL],
        {},
      );
    }
  }

  public async getAll(): Promise<GetCategory[]> {
    try {
      const categoryRepository = getRepository(Category);
      const categories = await categoryRepository.find();
      return categories;
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.GET_ALL_CATEGORIES_FAIL,
        categoryErrorMessages[categoryErrorKeys.GET_ALL_CATEGORIES_FAIL],
        {},
      );
    }
  }
}

import HttpError from '@errors/http-error';
import { categoryErrorKeys, categoryErrorMessages } from '@errors/translator/category';
import { getRepository } from 'typeorm';
import Category from '../entity/category';

export default class CategoryRepository {
  public async create(categoryData: any): Promise<any> {
    try {
      const categoryRepository = getRepository(Category);
      await categoryRepository.save(categoryData);
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.CREATE_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.CREATE_CATEGORY_FAIL],
        {},
      );
    }
  }

  public async remove(id: string): Promise<any> {
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

  public async update(id: string, categoryData: any): Promise<any> {
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

  public async get(id: string): Promise<any> {
    try {
      const categoryRepository = getRepository(Category);
      await categoryRepository.findOne(id);
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.GET_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.GET_CATEGORY_FAIL],
        {},
      );
    }
  }

  public async getAll(): Promise<any> {
    try {
      const categoryRepository = getRepository(Category);
      await categoryRepository.find();
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

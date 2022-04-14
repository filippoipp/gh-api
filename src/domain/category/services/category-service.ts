import HttpError from '@errors/http-error';
import { categoryErrorKeys, categoryErrorMessages } from '@errors/translator/category';
import CategoryRepository from '../repositories/category-repository';

export default class CategoryService {
  public async importCategories(file: any): Promise<any> {
    try {
      const string = file.buffer.toString();
      const categories = JSON.parse(string);
      const categoryRepository = new CategoryRepository();
      await Promise.all(
        categories.map(async (category) => {
          await categoryRepository.create(category);
        }),
      );
    } catch (error) {
      throw new HttpError(
        500,
        categoryErrorKeys.CREATE_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.CREATE_CATEGORY_FAIL],
        {},
      );
    }
  }
}

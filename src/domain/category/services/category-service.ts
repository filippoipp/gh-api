import HttpError from '@errors/http-error';
import { categoryErrorKeys, categoryErrorMessages } from '@errors/translator/category';

export default class CategoryService {
  public async importCategories(file: any): Promise<any> {
    try {
      const string = file.buffer.toString();
      const json = JSON.parse(string);
      return json
      const categoryService = new CategoryService();
    } catch (error) {
      console.log(error);
      throw new HttpError(
        500,
        categoryErrorKeys.CREATE_CATEGORY_FAIL,
        categoryErrorMessages[categoryErrorKeys.CREATE_CATEGORY_FAIL],
        {},
      );
    }
  }
}

import { NextFunction, Request, Response } from 'express';
import CategoryRepository from '../repositories/category-repository';
import CategoryService from '../services/category-service';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    const response = await categoryRepository.create(req.body);

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    await categoryRepository.remove(req.params.id);

    res.status(204).json();
  } catch (error) {
    next(error);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    await categoryRepository.update(req.params.id, req.body);

    res.status(200).json({ message: 'Category updated' });
  } catch (error) {
    next(error);
  }
}

async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    const response = await categoryRepository.get(req.params.id);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    const response = await categoryRepository.getAll();

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

async function importCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryService = new CategoryService();
    const response = await categoryService.importCategories(req.files[0]);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export default {
  create, remove, update, get, getAll, importCategories,
};

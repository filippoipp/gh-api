import { NextFunction, Request, Response } from 'express';
import CategoryRepository from '../repository/category-repository';

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
    const response = await categoryRepository.remove(req.params.id);

    res.status(204).json(response);
  } catch (error) {
    next(error);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    const response = await categoryRepository.update(req.params.id, req.body);

    res.status(204).json(response);
  } catch (error) {
    next(error);
  }
}

async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    const response = await categoryRepository.get(req.params.id);

    res.status(204).json(response);
  } catch (error) {
    next(error);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryRepository = new CategoryRepository();
    const response = await categoryRepository.getAll();

    res.status(204).json(response);
  } catch (error) {
    next(error);
  }
}

export default {
  create, remove, update, get, getAll,
};

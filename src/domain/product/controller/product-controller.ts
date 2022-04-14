import { NextFunction, Request, Response } from 'express';
import ProductRepository from '../repositories/product-repository';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const productRepository = new ProductRepository();
    const response = await productRepository.create(req.body);

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const productRepository = new ProductRepository();
    await productRepository.remove(req.params.id);

    res.status(204).json();
  } catch (error) {
    next(error);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const productRepository = new ProductRepository();
    await productRepository.update(req.params.id, req.body);

    res.status(200).json({ message: 'Product updated' });
  } catch (error) {
    next(error);
  }
}

async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const productRepository = new ProductRepository();
    const response = await productRepository.get(req.params.id);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const productRepository = new ProductRepository();
    const response = await productRepository.getAll();

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export default {
  create, remove, update, get, getAll,
};

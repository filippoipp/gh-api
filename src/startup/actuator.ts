import express, { Request, Response } from 'express';

const actuator = express.Router();
actuator.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'UP' });
});

export default actuator;

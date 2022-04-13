import express from 'express';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

import Config from '../config/app-config';

const directory = resolve(__dirname, '../', 'domain');

const isDirectory = (path) => statSync(path).isDirectory();

const fileExtension = Config.DEV || Config.TEST ? '.ts' : '.js';

function concat(routes, dir) {
  const path = `${dir}/routes`;
  if (!existsSync(path + fileExtension)) {
    return routes;
  }
  // eslint-disable-next-line
  const mod = require(path).default;
  return routes.concat(mod);
}

function load(arr: Array<any>, app: any) {
  arr.forEach((route) => {
    const fn = app[route.method];
    const handlers = route.handlers as Array<any>;

    fn.call(app, route.path, handlers);
  });
  return app;
}

const router = () => {
  const finalRoutes = readdirSync(directory)
    .map((file) => join(directory, file))
    .filter(isDirectory)
    .reduce(concat, []);
  return load(finalRoutes, express.Router());
};

export default router;

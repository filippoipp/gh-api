import sourceMapSupport from 'source-map-support';

import App from './startup/app';

function startApp() {
  const app = new App();
  Promise.resolve()
    .then(() => {
      sourceMapSupport.install();
      app.start();
    })
    .catch(() => {
      app.close();
    });
}

startApp();

import { createApp } from '../src/server/app.js';

let appInstance = null;

function getApp() {
  if (!appInstance) {
    const { app } = createApp();
    appInstance = app;
  }
  return appInstance;
}

export default function handler(req, res) {
  const app = getApp();
  return app(req, res);
}

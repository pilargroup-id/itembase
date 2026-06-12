const app    = require('./app');
const config = require('./config');

app.listen(config.app.port, () => {
  console.log(`[${config.app.name}] running on port ${config.app.port} (${config.app.env})`);

  if (config.app.env === 'development' && config.dev.authEnabled) {
    console.log(`[${config.app.name}] DEV_AUTH_ENABLED — auto-login as: ${config.dev.authUsername}`);
  }
});

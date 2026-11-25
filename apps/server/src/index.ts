import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const { app, library } = await buildApp(config, { logger: true });

const result = await library.scan();
app.log.info({ mediaDir: config.mediaDir, ...result }, 'Library scanned');

await app.listen({ port: config.port, host: config.host });

import { Shoukaku, Connectors } from 'shoukaku';
import { client } from '../../bot/client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let shoukaku: Shoukaku;

export function initLavalink() {
  const Nodes = [{
    name: 'Primary',
    url: `${env.LAVALINK_HOST}:${env.LAVALINK_PORT}`,
    auth: env.LAVALINK_PASSWORD,
    secure: env.LAVALINK_SECURE
  }];

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes);
  client.shoukaku = shoukaku;

  shoukaku.on('error', (_, error) => logger.error({ err: error }, 'Shoukaku error'));
  shoukaku.on('ready', (name) => logger.info(`Lavalink node ${name} is ready`));
  shoukaku.on('close', (name, code, reason) => logger.warn(`Lavalink node ${name} closed with code ${code} and reason ${reason}`));
  shoukaku.on('disconnect', (name, count) => logger.warn(`Lavalink node ${name} disconnected, count: ${count}`));
}

export function getShoukaku(): Shoukaku {
  if (!shoukaku) throw new Error('Shoukaku is not initialized');
  return shoukaku;
}

export function getNode() {
  const node = getShoukaku().options.nodeResolver(getShoukaku().nodes);
  if (!node) throw new Error('No Lavalink nodes are available');
  return node;
}

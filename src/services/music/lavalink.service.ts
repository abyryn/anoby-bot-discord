import { Shoukaku, Connectors, Node } from 'shoukaku';
import { client } from '../../bot/client.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let shoukaku: Shoukaku;

export function initLavalink() {
  const lavalinkHost = env.LAVALINK_HOST || 'lavalink';
  const lavalinkPort = env.LAVALINK_PORT || 2333;
  const lavalinkUrl = `${lavalinkHost}:${lavalinkPort}`;

  logger.info(`[Lavalink] Initializing connection to node: ${lavalinkUrl}...`);

  const Nodes = [{
    name: 'Primary',
    url: lavalinkUrl,
    auth: env.LAVALINK_PASSWORD,
    secure: env.LAVALINK_SECURE
  }];

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
    moveOnDisconnect: true,
    resume: true,
    reconnectTries: 100,
    reconnectInterval: 5000,
    restTimeout: 15000
  });
  client.shoukaku = shoukaku;

  shoukaku.on('error', (name, error) => {
    logger.error({ node: name, err: error }, '[Lavalink] Connection error');
  });

  shoukaku.on('ready', (name) => {
    logger.info(`[Lavalink] Node ${name} is CONNECTED and READY! 🎵`);
  });

  shoukaku.on('close', (name, code, reason) => {
    logger.warn({ node: name, code, reason }, `[Lavalink] Node ${name} connection closed`);
  });

  shoukaku.on('disconnect', (name, count) => {
    logger.warn({ node: name, count }, `[Lavalink] Node ${name} disconnected, retry attempt #${count}`);
  });

  shoukaku.on('reconnecting', (name, info) => {
    logger.info({ node: name, info }, `[Lavalink] Reconnecting to node ${name}...`);
  });
}

export function getShoukaku(): Shoukaku {
  if (!shoukaku) throw new Error('Shoukaku belum diinisialisasi.');
  return shoukaku;
}

export function getNode(): Node {
  const shk = getShoukaku();
  
  // 1. Try ideal node selection
  const idealNode = shk.getIdealNode();
  if (idealNode && idealNode.state === 1) { // 1 = CONNECTED
    return idealNode;
  }

  // 2. Try any connected node in the map
  const connectedNode = Array.from(shk.nodes.values()).find(n => n.state === 1);
  if (connectedNode) {
    return connectedNode;
  }

  // 3. Check if node is in connecting state (0 = CONNECTING)
  const connectingNode = Array.from(shk.nodes.values()).find(n => n.state === 0);
  if (connectingNode) {
    throw new Error('Server musik (Lavalink) sedang dalam proses menghubungkan ke bot. Mohon tunggu sekitar 5–10 detik lalu coba lagi.');
  }

  throw new Error('Server musik (Lavalink) belum terhubung. Pastikan container Lavalink sedang berjalan.');
}

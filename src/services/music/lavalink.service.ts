import { Shoukaku, Connectors, Node } from 'shoukaku';
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

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
    moveOnDisconnect: true,
    resume: true,
    reconnectTries: 100,
    reconnectInterval: 5000,
    restTimeout: 15000
  });
  client.shoukaku = shoukaku;

  shoukaku.on('error', (_, error) => logger.error({ err: error }, 'Shoukaku error'));
  shoukaku.on('ready', (name) => logger.info(`[INFO] Lavalink node ${name} is ready`));
  shoukaku.on('close', (name, code, reason) => logger.warn(`Lavalink node ${name} closed with code ${code} and reason: ${reason}`));
  shoukaku.on('disconnect', (name, count) => logger.warn(`Lavalink node ${name} disconnected, attempt: ${count}`));
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

  // 2. Try any connected node
  const connectedNode = Array.from(shk.nodes.values()).find(n => n.state === 1);
  if (connectedNode) {
    return connectedNode;
  }

  // 3. If node is in connecting state (0 = CONNECTING)
  const connectingNode = Array.from(shk.nodes.values()).find(n => n.state === 0);
  if (connectingNode) {
    throw new Error('Server musik (Lavalink) sedang dalam proses menghubungkan. Mohon tunggu sekitar 5–10 detik lalu coba lagi.');
  }

  throw new Error('Server musik (Lavalink) belum terhubung ke bot. Pastikan container Lavalink di Dokploy berstatus running.');
}

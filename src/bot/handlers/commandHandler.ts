import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BotClient } from '../client.js';
import { Command } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client: BotClient) {
  const commandsPath = join(__dirname, '../../commands');
  
  try {
    const categories = await readdir(commandsPath, { withFileTypes: true });
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      
      const categoryPath = join(commandsPath, category.name);
      const commandFiles = (await readdir(categoryPath)).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = join(categoryPath, file);
        const fileUrl = new URL(`file://${filePath}`).href;
        const module = await import(fileUrl);
        const command: Command = module.default;
        
        if ('name' in command && 'execute' in command) {
          client.commands.set(command.name, command);
          if (command.aliases) {
            for (const alias of command.aliases) {
              client.aliases.set(alias, command.name);
            }
          }
          logger.info(`Loaded command: ${command.name}`);
        } else {
          logger.warn(`Command at ${filePath} is missing a required "name" or "execute" property.`);
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Error loading commands');
  }
}

import * as crypto from 'crypto';
import * as Redis from 'ioredis';

const clientMap: { [key: string]: Redis.default; } = {};

export const setClient = (options: Redis.RedisOptions) => {
  const optionsHash = crypto.createHash('md5').update(JSON.stringify(options)).digest('hex');

  if (!clientMap[optionsHash])
    clientMap[optionsHash] = new Redis.default(options);

  return clientMap[optionsHash];
};

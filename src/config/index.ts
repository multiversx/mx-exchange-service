import { envload } from './env_load';
envload();
import config from 'config';

/**
 * Wallet object configuration.
 * Has 3rd party API hosts and other configurations
 */
export const elrondConfig = config.get('elrond');
/**
 * Caching time config.
 * The values are in seconds
 */
export const cacheConfig = config.get('caching');

export const scAddress = config.get('scAddress');

export const gasConfig = config.get('gas');

export const abiConfig = config.get('abi');

export const farmsConfig = config.get('farms');

export const tokenProviderUSD = config.get('tokenProviderUSD');

export const tokensPriceData = config.get('priceFeeds');

export const tokensSupplyConfig = config.get('tokensSupply');

export const cachedTokensPriceConfig = config.get('cachedTokensPrice');

export const cronConfig = config.get('cron');

export const constantsConfig = config.get('constants');

export const securityConfig = config.get('security');

export const awsConfig = config.get('aws');

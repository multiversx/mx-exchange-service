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

export const gasConfig = config.get('gas');

export const abiConfig = config.get('abi');

export const farmingConfig = config.get('farming');

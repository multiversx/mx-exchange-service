import { envload } from './env_load';
envload();
import config from 'config';

/**
 * Wallet object configuration.
 * Has 3rd party API hosts and other configurations
 */
export const mxConfig = config.get('multiversx');
/**
 * Caching time config.
 * The values are in seconds
 */
export const cacheConfig = config.get('caching');

export const scAddress = config.get('scAddress');

export const gasConfig = config.get('gasLimits');

export const abiConfig = config.get('abi');

export const farmsConfig = config.get('farms');

export const governanceConfig = config.get('governance');

export const tokenProviderUSD = config.get('tokenProviderUSD');

export const tokensSupplyConfig = config.get('tokensSupply');

export const cachedTokensPriceConfig = config.get('cachedTokensPrice');

export const cryptoRatesIdentifiers = config.get('cryptoRatesIdentifiers');

export const constantsConfig = config.get('constants');

export const dataApiConfig = config.get('dataApi');

export const leaguesConfig = config.get('leagues');

export const complexityConfig = config.get('complexity');

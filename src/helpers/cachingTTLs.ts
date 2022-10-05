import { oneHour } from './helpers';

export class CachingTtl {
    remoteTtl: number;
    localTtl?: number;
}

export type CachingTtlType = {
    remoteTtl: number;
    localTtl: number;
};

export const TokenTtl: CachingTtlType = {
    remoteTtl: oneHour() * 6,
    localTtl: oneHour() * 3,
};

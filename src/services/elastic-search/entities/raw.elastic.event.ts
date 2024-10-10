import { RawEventType } from '@multiversx/sdk-exchange';

export type RawElasticEventType = RawEventType & {
    logAddress: string;
    shardID: number;
    timestamp: number;
    txOrder: number;
    txHash: string;
    order: number;
};

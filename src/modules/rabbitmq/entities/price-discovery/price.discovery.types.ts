import { GenericTokenType } from 'src/models/genericToken.model';

export type PriceDiscoveryTopicsType = {
    eventName: string;
    caller: string;
    block: number;
    epoch: number;
    timestamp: number;
};

export type PhaseType = {
    name: string;
    penaltyPercent: number;
};

export type PriceDiscoveryEventType = {
    address: string;
    identifier: string;
};

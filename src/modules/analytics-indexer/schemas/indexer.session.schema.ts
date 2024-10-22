import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum IndexerStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    ABORTED = 'ABORTED',
}

export enum IndexerEventIdentifiers {
    SWAP_FIXED_INPUT = 'swapTokensFixedInput',
    SWAP_FIXED_OUTPUT = 'swapTokensFixedOutput',
    ESDT_LOCAL_BURN = 'ESDTLocalBurn',
    ADD_LIQUIDITY = 'addLiquidity',
    REMOVE_LIQUIDITY = 'removeLiquidity',
    PRICE_DISCOVERY_DEPOSIT = 'deposit',
    PRICE_DISCOVERY_WITHDRAW = 'withdraw',
}

export enum IndexerEventTypes {
    SWAP_EVENTS = 'SWAP_EVENTS',
    LIQUIDITY_EVENTS = 'LIQUIDITY_EVENTS',
    PRICE_DISCOVERY_EVENTS = 'PRICE_DISCOVERY_EVENTS',
    MEX_BURN_EVENTS = 'MEX_BURN_EVENTS',
}

export class IndexerJob {
    startTimestamp: number;
    endTimestamp: number;
    order: number;
    status: IndexerStatus;
    runAttempts = 0;
    errorCount = 0;
    durationMs = 0;

    constructor(init?: Partial<IndexerJob>) {
        Object.assign(this, init);
    }
}

export type IndexerSessionDocument = IndexerSession & Document;

@Schema({
    collection: 'indexer_sessions',
})
export class IndexerSession {
    @Prop({ required: true, unique: true })
    name: string;
    @Prop({ required: true })
    startTimestamp: number;
    @Prop({ required: true })
    endTimestamp: number;
    @Prop(() => [IndexerEventTypes])
    eventTypes: IndexerEventTypes[];
    @Prop(() => [IndexerJob])
    jobs: IndexerJob[];
    @Prop(() => IndexerStatus)
    status: IndexerStatus;

    constructor(init?: Partial<IndexerSession>) {
        Object.assign(this, init);
    }
}

export const IndexerSessionSchema =
    SchemaFactory.createForClass(IndexerSession);

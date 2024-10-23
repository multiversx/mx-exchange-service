import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IndexerEventTypes } from '../entities/indexer.event.types';

export enum IndexerStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    ABORTED = 'ABORTED',
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

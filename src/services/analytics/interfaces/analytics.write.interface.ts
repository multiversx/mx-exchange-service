import { IngestRecord } from '../entities/ingest.record';

export interface AnalyticsWriteInterface {
    ingest({ data, Time }): Promise<void>;

    multiRecordsIngest(Records: IngestRecord[]): Promise<void>;
}

import { TimestreamWrite } from 'aws-sdk';

export interface AnalyticsWriteInterface {
    ingest({ data, Time }): Promise<void>;

    multiRecordsIngest(Records: TimestreamWrite.Records): Promise<void>;
}

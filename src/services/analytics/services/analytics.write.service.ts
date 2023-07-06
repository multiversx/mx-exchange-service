import { Injectable } from '@nestjs/common';
import { TimescaleDBWriteService } from '../timescaledb/timescaledb.write.service';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';
import { IngestRecord } from '../entities/ingest.record';

@Injectable()
export class AnalyticsWriteService implements AnalyticsWriteInterface {
    constructor(private readonly timescaleDBWrite: TimescaleDBWriteService) {}

    public async ingest({ data, Time }): Promise<void> {
        const promises = [];

        promises.push(this.timescaleDBWrite.ingest({ data, Time }));

        await Promise.all(promises);
    }

    public async multiRecordsIngest(Records: IngestRecord[]): Promise<void> {
        const promises = [];

        promises.push(this.timescaleDBWrite.multiRecordsIngest(Records));

        await Promise.all(promises);
    }
}

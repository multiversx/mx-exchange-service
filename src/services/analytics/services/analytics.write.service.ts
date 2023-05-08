import { Injectable } from '@nestjs/common';
import { TimestreamWrite } from 'aws-sdk';
import { TimescaleDBWriteService } from '../timescaledb/timescaledb.write.service';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';

@Injectable()
export class AnalyticsWriteService implements AnalyticsWriteInterface {
    constructor(private readonly timescaleDBWrite: TimescaleDBWriteService) {}

    public async ingest({ data, Time }): Promise<void> {
        const promises = [];

        promises.push(this.timescaleDBWrite.ingest({ data, Time }));

        await Promise.all(promises);
    }

    public async multiRecordsIngest(
        Records: TimestreamWrite.Records,
    ): Promise<void> {
        const promises = [];

        promises.push(this.timescaleDBWrite.multiRecordsIngest(Records));

        await Promise.all(promises);
    }
}

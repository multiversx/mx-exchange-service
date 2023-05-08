import { Injectable } from '@nestjs/common';
import { TimestreamWrite } from 'aws-sdk';
import { DataApiWriteService } from '../data-api/data-api.write.service';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';

@Injectable()
export class AnalyticsWriteService implements AnalyticsWriteInterface {
    constructor(private readonly dataApiWrite: DataApiWriteService) {}

    public async ingest({ TableName, data, Time }): Promise<void> {
        const promises = [];

        promises.push(this.dataApiWrite.ingest({ data, Time }));

        await Promise.all(promises);
    }

    public async multiRecordsIngest(
        TableName: string,
        Records: TimestreamWrite.Records,
    ): Promise<void> {
        const promises = [];

        promises.push(this.dataApiWrite.multiRecordsIngest(TableName, Records));

        await Promise.all(promises);
    }
}

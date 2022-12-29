import { Injectable, Optional } from '@nestjs/common';
import { TimestreamWrite } from 'aws-sdk';
import { AWSTimestreamWriteService } from '../aws/aws.timestream.write';
import { DataApiWriteService } from '../data-api/data-api.write.service';
import { AnalyticsModuleOptions } from '../entities/analytics.module.options';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';

@Injectable()
export class AnalyticsWriteService implements AnalyticsWriteInterface {
  constructor(
    private readonly options: AnalyticsModuleOptions,
    @Optional() private readonly awsWrite?: AWSTimestreamWriteService,
    @Optional() private readonly dataApiWrite?: DataApiWriteService,
  ) { }

  public async ingest({ TableName, data, Time }): Promise<void> {
    const promises = [];

    if (this.options.writeFlags.awsTimestream && this.awsWrite) {
      promises.push(this.awsWrite.ingest({ TableName, data, Time }));
    }

    if (this.options.writeFlags.dataApi && this.dataApiWrite) {
      promises.push(this.dataApiWrite.ingest({ data, Time }));
    };

    await Promise.all(promises);
  }

  public async multiRecordsIngest(TableName: string, Records: TimestreamWrite.Records): Promise<void> {
    const promises = [];

    if (this.options.writeFlags.awsTimestream && this.awsWrite) {
      promises.push(this.awsWrite.multiRecordsIngest(TableName, Records));
    }

    if (this.options.writeFlags.dataApi && this.dataApiWrite) {
      promises.push(this.dataApiWrite.multiRecordsIngest(TableName, Records));
    }

    await Promise.all(promises);
  }
}

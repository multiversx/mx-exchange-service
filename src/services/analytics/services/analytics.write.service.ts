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
    await Promise.all([
      this.options.writeFlags.awsTimestream && this.awsWrite?.ingest({ TableName, data, Time }),
      this.options.writeFlags.dataApi && this.dataApiWrite?.ingest({ data, Time }),
    ]);
  }

  public async multiRecordsIngest(TableName: string, Records: TimestreamWrite.Records): Promise<void> {
    await Promise.all([
      this.options.writeFlags.awsTimestream && this.awsWrite?.multiRecordsIngest(TableName, Records),
      this.options.writeFlags.dataApi && this.dataApiWrite?.multiRecordsIngest(TableName, Records),
    ]);
  }
}

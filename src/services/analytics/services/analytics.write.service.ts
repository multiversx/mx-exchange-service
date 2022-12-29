import { Injectable, Optional } from '@nestjs/common';
import { TimestreamWrite } from 'aws-sdk';
import { AWSTimestreamWriteService } from '../aws/aws.timestream.write';
import { DataApiWriteService } from '../data-api/data-api.write.service';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';

@Injectable()
export class AnalyticsWriteService implements AnalyticsWriteInterface {
  constructor(
    @Optional() private readonly awsWrite?: AWSTimestreamWriteService,
    @Optional() private readonly dataApiWrite?: DataApiWriteService,
  ) { }

  public async ingest({ TableName, data, Time }): Promise<void> {
    await Promise.all([
      this.awsWrite?.ingest({ TableName, data, Time }),
      this.dataApiWrite?.ingest({ data, Time }),
    ]);
  }

  public async multiRecordsIngest(TableName: string, Records: TimestreamWrite.Records): Promise<void> {
    await Promise.all([
      this.awsWrite?.multiRecordsIngest(TableName, Records),
      this.dataApiWrite?.multiRecordsIngest(TableName, Records),
    ]);
  }
}

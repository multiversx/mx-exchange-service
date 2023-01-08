import { Injectable } from '@nestjs/common';
import { TimestreamWrite } from 'aws-sdk';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { AWSTimestreamWriteService } from '../aws/aws.timestream.write';
import { DataApiWriteService } from '../data-api/data-api.write.service';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';

@Injectable()
export class AnalyticsWriteService implements AnalyticsWriteInterface {
  constructor(
    private readonly remoteConfigGetterService: RemoteConfigGetterService,
    private readonly awsWrite: AWSTimestreamWriteService,
    private readonly dataApiWrite: DataApiWriteService,
  ) { }

  public async ingest({ TableName, data, Time }): Promise<void> {
    const [isAwsTimestreamWriteActive, isDataApiWriteActive] = await this.getAnalyticsWriteFlags();

    const promises = [];

    if (isAwsTimestreamWriteActive) {
      promises.push(this.awsWrite.ingest({ TableName, data, Time }));
    }

    if (isDataApiWriteActive) {
      promises.push(this.dataApiWrite.ingest({ data, Time }));
    };

    await Promise.all(promises);
  }

  public async multiRecordsIngest(TableName: string, Records: TimestreamWrite.Records): Promise<void> {
    const [isAwsTimestreamWriteActive, isDataApiWriteActive] = await this.getAnalyticsWriteFlags();

    const promises = [];

    if (isAwsTimestreamWriteActive) {
      promises.push(this.awsWrite.multiRecordsIngest(TableName, Records));
    }

    if (isDataApiWriteActive) {
      promises.push(this.dataApiWrite.multiRecordsIngest(TableName, Records));
    }

    await Promise.all(promises);
  }

  private async getAnalyticsWriteFlags(): Promise<[boolean, boolean]> {
    const flags = await Promise.all([
      this.remoteConfigGetterService.getAnalyticsAWSTimestreamWriteFlagValue(),
      this.remoteConfigGetterService.getAnalyticsDataApiWriteFlagValue(),
    ]);
    return flags;
  }
}

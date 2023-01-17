import { TimestreamWrite } from "aws-sdk"

export interface AnalyticsWriteInterface {
  ingest({ TableName, data, Time }): Promise<void>

  multiRecordsIngest(TableName: string, Records: TimestreamWrite.Records): Promise<void>
}

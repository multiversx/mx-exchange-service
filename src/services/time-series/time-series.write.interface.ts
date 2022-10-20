import TimestreamWrite from "aws-sdk/clients/timestreamwrite"

export interface TimeSeriesWriteInterface {
  ingest({ TableName, data, Time }): Promise<void>

  multiRecordsIngest(   TableName: string,   Records: TimestreamWrite.Records):Promise<void>
}
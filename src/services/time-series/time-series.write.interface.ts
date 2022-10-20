export interface TimeSeriesWriteInterface {
  ingest({ TableName, data, Time }): Promise<void>
}
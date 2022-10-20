import { Injectable } from "@nestjs/common";
import { TimeSeriesWriteInterface } from "../time-series/time-series.write.interface";

@Injectable()
export class DataApiWriteService implements TimeSeriesWriteInterface{
  ingest({ TableName, data, Time }): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
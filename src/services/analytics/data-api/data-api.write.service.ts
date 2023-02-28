import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { mxConfig } from 'src/config';
import { Logger } from 'winston';
import { TimestreamWrite } from 'aws-sdk';
import { generateLogMessage } from 'src/utils/generate-log-message';
import moment from 'moment';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';
import { DataApiClient } from '@multiversx/sdk-data-api-client';
import fs from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { XExchangeAnalyticsEntity } from './entities/data.api.entities';
import { Repository } from 'typeorm';

@Injectable()
export class DataApiWriteService implements AnalyticsWriteInterface {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @InjectRepository(XExchangeAnalyticsEntity)
        private readonly dexAnalytics: Repository<XExchangeAnalyticsEntity>,
    ) {}

    async ingest({ data, Time }) {
        try {
            const records = this.createRecords({ data, Time });
            await this.writeRecords(records);
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.ingest.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        }
    }

    async multiRecordsIngest(
        _tableName: string,
        Records: TimestreamWrite.Records,
    ) {
        try {
            const ingestRecords =
                this.convertAWSRecordsToDataAPIRecords(Records);
            await this.writeRecords(ingestRecords);
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.multiRecordsIngest.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        }
    }

    private async writeRecords(
        records: XExchangeAnalyticsEntity[],
    ): Promise<void> {
        const profiler = new PerformanceProfiler('ingestData');

        try {
            this.dexAnalytics.save(records);
        } catch (errors) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.writeRecords.name,
                '',
                {
                    message: 'Internal Server Error',
                    status: 500,
                    response: errors,
                },
            );
            this.logger.error(logMessage);
        } finally {
            profiler.stop();

            MetricsCollector.setExternalCall(
                DataApiWriteService.name,
                'ingestData',
                profiler.duration,
            );
        }
    }

    createRecords({ data, Time }): XExchangeAnalyticsEntity[] {
        const records: XExchangeAnalyticsEntity[] = [];
        Object.keys(data).forEach((series) => {
            Object.keys(data[series]).forEach((key) => {
                const value = data[series][key].toString();
                records.push(
                    new XExchangeAnalyticsEntity({
                        series,
                        key,
                        value,
                        timestamp: new Date(Time * 1000),
                    }),
                );
            });
        });
        return records;
    }

    private convertAWSRecordsToDataAPIRecords(
        Records: TimestreamWrite.Records,
    ): XExchangeAnalyticsEntity[] {
        const ingestRecords = Records.map((record) => {
            return new XExchangeAnalyticsEntity({
                timestamp: new Date(
                    moment(parseInt(record.Time) * 1000).unix(),
                ),
                series: record.Dimensions[0].Value,
                key: record.MeasureName,
                value: record.MeasureValue,
            });
        });
        return ingestRecords;
    }
}

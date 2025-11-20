import { Injectable } from '@nestjs/common';
import { constantsConfig } from '../../../config';
import {
    ErrInvalidEpochLowerThanFirstWeekStartEpoch,
    ErrInvalidWeek,
} from '../errors';
import { IWeekTimekeepingComputeService } from '../interfaces';
import { WeekTimekeepingAbiService } from './week-timekeeping.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { WeekTimekeepingModel } from '../models/week-timekeeping.model';

@Injectable()
export class WeekTimekeepingComputeService
    implements IWeekTimekeepingComputeService
{
    readonly epochsInWeek: number;

    constructor(
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
    ) {
        this.epochsInWeek = constantsConfig.EPOCHS_IN_WEEK;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weekTimekeeping',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async weekForEpoch(scAddress: string, epoch: number): Promise<number> {
        return this.computeWeekForEpoch(scAddress, epoch);
    }

    async computeWeekForEpoch(
        scAddress: string,
        epoch: number,
    ): Promise<number> {
        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(scAddress);
        if (epoch < firstWeekStartEpoch) {
            throw ErrInvalidEpochLowerThanFirstWeekStartEpoch;
        }

        return (
            Math.floor((epoch - firstWeekStartEpoch) / this.epochsInWeek) + 1
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weekTimekeeping',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async startEpochForWeek(scAddress: string, week: number): Promise<number> {
        return this.computeStartEpochForWeek(scAddress, week);
    }

    async computeStartEpochForWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        if (week <= 0) {
            throw ErrInvalidWeek;
        }
        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(scAddress);
        return firstWeekStartEpoch + (week - 1) * this.epochsInWeek;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weekTimekeeping',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async endEpochForWeek(scAddress: string, week: number): Promise<number> {
        return this.computeEndEpochForWeek(scAddress, week);
    }

    async computeEndEpochForWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        if (week <= 0) {
            throw ErrInvalidWeek;
        }

        const startEpochForWeek = await this.computeStartEpochForWeek(
            scAddress,
            week,
        );
        return startEpochForWeek + this.epochsInWeek - 1;
    }

    computeWeekTimekeeping(
        scAddress: string,
        currentWeek: number,
        firstWeekStartEpoch: number,
    ): WeekTimekeepingModel {
        const startEpochForWeek =
            firstWeekStartEpoch +
            (currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
        const endEpochForWeek =
            startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;

        return new WeekTimekeepingModel({
            currentWeek,
            firstWeekStartEpoch,
            startEpochForWeek,
            endEpochForWeek,
            scAddress,
        });
    }
}

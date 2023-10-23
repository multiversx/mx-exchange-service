import { WeekTimekeepingComputeService } from '../services/week-timekeeping.compute.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ErrInvalidEpochLowerThanFirstWeekStartEpoch,
    ErrInvalidWeek,
} from '../errors';
import { WeekTimekeepingAbiServiceProvider } from '../mocks/week.timekeeping.abi.service.mock';
import { WeekTimekeepingAbiService } from '../services/week-timekeeping.abi.service';
import { Address } from '@multiversx/sdk-core/out';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

describe('WeekTimekeepingComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('init service; should be defined', async () => {
        const service = module.get<WeekTimekeepingComputeService>(
            WeekTimekeepingComputeService,
        );
        expect(service).toBeDefined();
    });

    it('computeWeekForEpoch', async () => {
        const service = module.get<WeekTimekeepingComputeService>(
            WeekTimekeepingComputeService,
        );
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        const scAddress = Address.Zero().bech32();
        const firstWeekStartEpoch =
            await weekTimekeepingAbi.firstWeekStartEpoch(scAddress);
        // epoch < firstWeekStartEpoch should error
        await expect(
            service.computeWeekForEpoch(scAddress, firstWeekStartEpoch - 1),
        ).rejects.toThrowError(ErrInvalidEpochLowerThanFirstWeekStartEpoch);
        // epoch == firstWeekStartEpoch
        expect(
            await service.computeWeekForEpoch(scAddress, firstWeekStartEpoch),
        ).toEqual(1);
        // epoch == firstWeekStartEpoch + epochsInWeek - 1
        expect(
            await service.computeWeekForEpoch(
                scAddress,
                firstWeekStartEpoch + service.epochsInWeek - 1,
            ),
        ).toEqual(1);
        // epoch == firstWeekStartEpoch + epochsInWeek
        expect(
            await service.computeWeekForEpoch(
                scAddress,
                firstWeekStartEpoch + service.epochsInWeek,
            ),
        ).toEqual(2);
    });

    it('computeStartEpochForWeek', async () => {
        const service = module.get<WeekTimekeepingComputeService>(
            WeekTimekeepingComputeService,
        );
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        const scAddress = Address.Zero().bech32();
        const firstWeekStartEpoch =
            await weekTimekeepingAbi.firstWeekStartEpoch(scAddress);
        // week < 0 should error
        await expect(
            service.computeStartEpochForWeek(scAddress, -1),
        ).rejects.toThrowError(ErrInvalidWeek);
        //week = 0 should error
        await expect(
            service.computeStartEpochForWeek(scAddress, 0),
        ).rejects.toThrowError(ErrInvalidWeek);
        //week == 1 should return firstWeekStartEpoch
        expect(await service.computeStartEpochForWeek(scAddress, 1)).toEqual(
            firstWeekStartEpoch,
        );
        //should return good value
        expect(await service.computeStartEpochForWeek(scAddress, 2)).toEqual(
            250 + service.epochsInWeek,
        );
    });

    it('computeEndEpochForWeek', async () => {
        const service = module.get<WeekTimekeepingComputeService>(
            WeekTimekeepingComputeService,
        );
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        const scAddress = Address.Zero().bech32();
        const firstWeekStartEpoch =
            await weekTimekeepingAbi.firstWeekStartEpoch(scAddress);

        // week < 0 should error
        await expect(
            service.computeEndEpochForWeek(scAddress, -1),
        ).rejects.toThrowError(ErrInvalidWeek);
        // week = 0 should error
        await expect(
            service.computeEndEpochForWeek(scAddress, 0),
        ).rejects.toThrowError(ErrInvalidWeek);
        // week == 1 should return firstWeekStartEpoch
        expect(await service.computeEndEpochForWeek(scAddress, 1)).toEqual(
            firstWeekStartEpoch + service.epochsInWeek - 1,
        );
        // should return good value
        expect(await service.computeEndEpochForWeek(scAddress, 2)).toEqual(
            firstWeekStartEpoch + 2 * service.epochsInWeek - 1,
        );
    });
});

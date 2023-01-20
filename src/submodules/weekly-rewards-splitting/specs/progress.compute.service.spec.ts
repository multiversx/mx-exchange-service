import { Test, TestingModule } from '@nestjs/testing';
import { ProgressComputeService } from '../services/progress.compute.service';
import { EnergyComputeService } from '../../../modules/energy/services/energy.compute.service';
import {
    EnergyComputeHandlers,
    EnergyComputeServiceMock,
} from '../../../modules/simple-lock/mocks/energy.compute.service.mock';
import { EnergyType } from '@multiversx/sdk-exchange';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import BigNumber from 'bignumber.js';
import { EnergyModel } from 'src/modules/energy/models/energy.model';

describe('WeeklyRewardsSplittingComputeService', () => {
    const expectedErr = new Error('expected err');
    it('init service; should be defined', async () => {
        const service = await createService({});
        expect(service).toBeDefined();
    });
    it(
        'advanceWeek' + 'depleteUserEnergy throws error should error',
        async () => {
            const service = await createService({
                depleteUserEnergy: (
                    energyEntry: EnergyType,
                    currentEpoch: number,
                ) => {
                    throw expectedErr;
                },
            });
            const progress = createMockProgress();
            try {
                service.advanceWeek(progress, undefined, 7);
            } catch (e) {
                expect(e).toEqual(expectedErr);
            }
        },
    );
    it('advanceWeek' + 'undefined nextWeekEnergy', async () => {
        const service = await createService({
            depleteUserEnergy: (
                energyEntry: EnergyType,
                currentEpoch: number,
            ) => {
                energyEntry.lastUpdateEpoch = currentEpoch;
                energyEntry.amount = new BigNumber(energyEntry.amount)
                    .minus(5)
                    .toFixed();
                return energyEntry;
            },
        });
        const currentWeek = 10;
        const currentEpoch = 70;
        const progress = createMockProgress();
        const returnedProgress = await service.advanceWeek(
            progress,
            undefined,
            7,
        );
        expect(returnedProgress.week).toEqual(currentWeek + 1);
        expect(returnedProgress.energy.lastUpdateEpoch).toEqual(currentEpoch);
        expect(returnedProgress.energy.amount).toEqual('95');
    });
    it(
        'advanceWeek' + 'given nextWeekEnergy should replace current',
        async () => {
            const expectedEnergy = new EnergyModel({
                amount: '1000',
                lastUpdateEpoch: 500,
                totalLockedTokens: '1000',
            });
            const progress = createMockProgress();
            const service = await createService({
                depleteUserEnergy: (
                    energyEntry: EnergyType,
                    currentEpoch: number,
                ) => {
                    energyEntry.lastUpdateEpoch = currentEpoch;
                    energyEntry.amount = new BigNumber(energyEntry.amount)
                        .minus(5)
                        .toFixed();
                    return energyEntry;
                },
            });
            const returnedProgress = await service.advanceWeek(
                progress,
                expectedEnergy,
                7,
            );
            expect(returnedProgress.energy).toEqual(expectedEnergy);
        },
    );
});

export function createMockProgress(
    currentWeek = 10,
    currentEpoch = 70,
): ClaimProgress {
    const energy = new EnergyModel({
        amount: '100',
        lastUpdateEpoch: currentEpoch - 7,
        totalLockedTokens: '100',
    });
    return new ClaimProgress({
        energy: energy,
        week: currentWeek,
    });
}

async function createService(handlers: Partial<EnergyComputeHandlers>) {
    const compute = new EnergyComputeServiceMock(handlers);
    const module: TestingModule = await Test.createTestingModule({
        imports: [],
        providers: [
            {
                provide: EnergyComputeService,
                useValue: compute,
            },
            ProgressComputeService,
        ],
    }).compile();
    return module.get<ProgressComputeService>(ProgressComputeService);
}

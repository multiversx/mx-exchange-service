import { Test, TestingModule } from '@nestjs/testing';
import { ProgressComputeService } from '../services/progress.compute.service';
import { EnergyComputeService } from '../../../modules/energy/services/energy.compute.service';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import BigNumber from 'bignumber.js';
import { EnergyModel } from 'src/modules/energy/models/energy.model';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';

describe('ProgressComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [],
            providers: [
                ProgressComputeService,
                EnergyComputeService,
                EnergyAbiServiceProvider,
            ],
        }).compile();
    });

    it('init service; should be defined', async () => {
        const service = module.get<ProgressComputeService>(
            ProgressComputeService,
        );
        expect(service).toBeDefined();
    });

    it('advanceWeek' + 'undefined nextWeekEnergy', async () => {
        const service = module.get<ProgressComputeService>(
            ProgressComputeService,
        );
        const energyCompute =
            module.get<EnergyComputeService>(EnergyComputeService);

        const currentWeek = 10;
        const currentEpoch = 70;
        const progress = createMockProgress();

        jest.spyOn(energyCompute, 'depleteUserEnergy').mockReturnValue({
            amount: new BigNumber(progress.energy.amount).minus(5).toFixed(),
            lastUpdateEpoch: currentEpoch,
            totalLockedTokens: '100',
        });

        const returnedProgress = service.advanceWeek(progress, undefined, 7);
        expect(returnedProgress.week).toEqual(currentWeek + 1);
        expect(returnedProgress.energy.lastUpdateEpoch).toEqual(70);
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

            const service = module.get<ProgressComputeService>(
                ProgressComputeService,
            );
            const returnedProgress = service.advanceWeek(
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

import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from '../mocks/farm.v1.2.abi.service.mock';
import { FarmServiceProvider } from '../mocks/farm.service.mock';
import { FarmServiceV1_2 } from '../v1.2/services/farm.v1.2.service';

describe('FarmService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                FarmAbiServiceProviderV1_2,
                FarmServiceV1_2,
                FarmComputeServiceV1_2,
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        expect(service).toBeDefined();
    });

    it('should compute farm locked value USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const farmLockedValueUSD = await service.computeFarmLockedValueUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmLockedValueUSD).toEqual('32000080000000');
    });

    it('should get unlocked rewards APR', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const farmAPR = await service.computeUnlockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmAPR).toEqual('10.00004379989050027374');
    });

    it('should compute locked farming token reserve', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const lockedFarmingTokenReserve =
            await service.computeLockedFarmingTokenReserve(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(lockedFarmingTokenReserve).toEqual('200000000000000000000000');
    });

    it('should compute unlocked farming token reserve', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const unlockedFarmingTokenReserve =
            await service.computeUnlockedFarmingTokenReserve(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(unlockedFarmingTokenReserve).toEqual('200000000000000000000000');
    });

    it('should compute locked farming token reserve USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const lockedFarmingTokenReserveUSD =
            await service.computeLockedFarmingTokenReserveUSD(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(lockedFarmingTokenReserveUSD).toEqual('16000040000000');
    });

    it('should compute unlocked farming token reserve USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const unlockedFarmingTokenReserveUSD =
            await service.computeUnlockedFarmingTokenReserveUSD(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(unlockedFarmingTokenReserveUSD).toEqual('16000040000000');
    });

    it('should compute virtual value locked USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const virtualValueLockedUSD =
            await service.computeVirtualValueLockedUSD(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(virtualValueLockedUSD).toEqual('48000120000000');
    });

    it('should compute unlocked rewards APR', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const unlockedRewardsAPR = await service.computeUnlockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(unlockedRewardsAPR).toEqual('10.00004379989050027374');
    });

    it('should compute locked rewards APR', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const lockedRewardsAPR = await service.computeLockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(lockedRewardsAPR).toEqual('10.00008759978100054749');
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { AbiFarmServiceProvider } from '../mocks/abi.farm.service.mock';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { MXApiServiceMock } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from '../../../modules/pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { WrapService } from '../../wrapping/wrap.service';
import { WrapServiceMock } from '../../wrapping/wrap.test-mocks';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { FarmGetterServiceProviderV1_2 } from '../mocks/farm.v1.2.getter.service.mock';
import { CMCApiGetterServiceProvider } from 'src/services/external-communication/mocks/api.cmc.getter.service.mock';

describe('FarmService', () => {
    let service: FarmComputeServiceV1_2;

    const MXApiServiceProvider = {
        provide: MXApiService,
        useClass: MXApiServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiFarmServiceProvider,
                FarmGetterServiceProviderV1_2,
                FarmComputeServiceV1_2,
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                CMCApiGetterServiceProvider,
            ],
        }).compile();

        service = module.get<FarmComputeServiceV1_2>(FarmComputeServiceV1_2);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compute farm locked value USD', async () => {
        const farmLockedValueUSD = await service.computeFarmLockedValueUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmLockedValueUSD).toEqual('32000080000000');
    });

    it('should get unlocked rewards APR', async () => {
        const farmAPR = await service.computeUnlockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmAPR).toEqual('10.00004379989050027374');
    });

    it('should compute locked farming token reserve', async () => {
        const lockedFarmingTokenReserve =
            await service.computeLockedFarmingTokenReserve(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(lockedFarmingTokenReserve).toEqual('200000000000000000000000');
    });

    it('should compute unlocked farming token reserve', async () => {
        const unlockedFarmingTokenReserve =
            await service.computeUnlockedFarmingTokenReserve(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(unlockedFarmingTokenReserve).toEqual('200000000000000000000000');
    });

    it('should compute locked farming token reserve USD', async () => {
        const lockedFarmingTokenReserveUSD =
            await service.computeLockedFarmingTokenReserveUSD(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(lockedFarmingTokenReserveUSD).toEqual('16000040000000');
    });

    it('should compute unlocked farming token reserve USD', async () => {
        const unlockedFarmingTokenReserveUSD =
            await service.computeUnlockedFarmingTokenReserveUSD(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(unlockedFarmingTokenReserveUSD).toEqual('16000040000000');
    });

    it('should compute virtual value locked USD', async () => {
        const virtualValueLockedUSD =
            await service.computeVirtualValueLockedUSD(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        expect(virtualValueLockedUSD).toEqual('48000120000000');
    });

    it('should compute unlocked rewards APR', async () => {
        const unlockedRewardsAPR = await service.computeUnlockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(unlockedRewardsAPR).toEqual('10.00004379989050027374');
    });

    it('should compute locked rewards APR', async () => {
        const lockedRewardsAPR = await service.computeLockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(lockedRewardsAPR).toEqual('10.00008759978100054749');
    });
});

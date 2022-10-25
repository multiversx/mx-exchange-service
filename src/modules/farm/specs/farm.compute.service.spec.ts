import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { FarmService } from '../base-module/services/farm.service';
import { AbiFarmServiceProvider } from '../mocks/abi.farm.service.mock';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../../services/elrond-communication/elrond.api.service.mock';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmComputeService } from '../base-module/services/farm.compute.service';
import { FarmGetterServiceProvider } from '../mocks/farm.getter.service.mock';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from '../../pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { WrapService } from '../../wrapping/wrap.service';
import { WrapServiceMock } from '../../wrapping/wrap.test-mocks';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';

describe('FarmService', () => {
    let service: FarmComputeService;

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
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
                FarmGetterServiceProvider,
                FarmComputeService,
                ElrondApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                FarmService,
            ],
        }).compile();

        service = module.get<FarmComputeService>(FarmComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compute farmed token price USD', async () => {
        const farmedTokenPriceUSD = await service.computeFarmedTokenPriceUSD(
            'farm_address_2',
        );
        expect(farmedTokenPriceUSD).toEqual('10');
    });

    it('should compute farming token price USD', async () => {
        const farmingTokenPriceUSD = await service.computeFarmingTokenPriceUSD(
            'farm_address_2',
        );
        expect(farmingTokenPriceUSD).toEqual('40');
    });

    it('should compute farm rewards for position', async () => {
        const farmRewardsForPosition =
            await service.computeFarmRewardsForPosition(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                '100000000000000000000000000000',
                new FarmTokenAttributesModel({
                    identifier: undefined,
                    attributes: undefined,
                    rewardPerShare: '100',
                    originalEnteringEpoch: 0,
                    enteringEpoch: 0,
                    aprMultiplier: 25,
                    initialFarmingAmount: '10000000000000000000',
                    compoundedReward: '500000000000000',
                    currentFarmAmount: '100000000000000',
                    lockedRewards: true,
                }),
            );
        expect(farmRewardsForPosition.toFixed()).toEqual(
            '18333333333333333333333000',
        );
    });

    it('should compute anual rewards USD', async () => {
        const anualRewardsUSD = await service.computeAnualRewardsUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(anualRewardsUSD).toEqual('2102400000');
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { FarmService } from '../services/farm.service';
import { AbiFarmService } from '../services/abi-farm.service';
import { AbiFarmServiceMock } from '../mocks/abi.farm.service.mock';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../../services/elrond-communication/elrond.api.service.mock';
import { RewardsModel } from '../models/farm.model';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../services/farm.getter.service';
import { FarmComputeService } from '../services/farm.compute.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

describe('FarmService', () => {
    let service: FarmService;
    let computeService: FarmComputeService;

    const AbiFarmServiceProvider = {
        provide: AbiFarmService,
        useClass: AbiFarmServiceMock,
    };

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
    };

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
        useClass: PairGetterServiceMock,
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
                WrapServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                FarmService,
            ],
        }).compile();

        service = module.get<FarmService>(FarmService);
        computeService = module.get<FarmComputeService>(FarmComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get rewards with locked rewards', async () => {
        const attributes =
            'AAAABwc+9Mqu1tkAAAAAAAAAAQAAAAAAAAABAgEAAAAIiscjBInoAAAAAAAAAAAACQEVjkYJE9AAAA==';
        const identifier = 'MEXFARM-abcd-01';
        const liquidity = '2000000000000000000';
        const rewards = await service.getRewardsForPosition({
            farmAddress: 'farm_address_1',
            identifier: identifier,
            attributes: attributes,
            liquidity: liquidity,
            vmQuery: true,
        });

        expect(rewards).toEqual(
            new RewardsModel({
                decodedAttributes: new FarmTokenAttributesModel({
                    identifier: 'MEXFARM-abcd-01',
                    attributes:
                        'AAAABwc+9Mqu1tkAAAAAAAAAAQAAAAAAAAABAgEAAAAIiscjBInoAAAAAAAAAAAACQEVjkYJE9AAAA==',
                    rewardPerShare: '2039545930372825',
                    originalEnteringEpoch: 1,
                    enteringEpoch: 1,
                    aprMultiplier: 2,
                    lockedRewards: true,
                    initialFarmingAmount: '10000000000000000000',
                    compoundedReward: '0',
                    currentFarmAmount: '20000000000000000000',
                }),
                remainingFarmingEpochs: 3,
                rewards: '1000000000000000000',
            }),
        );
    });

    it('should get unlocked rewards APR', async () => {
        const farmAPR = await computeService.computeUnlockedRewardsAPR(
            'farm_address_1',
        );
        expect(farmAPR).toEqual('1314010');
    });
});

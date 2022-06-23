import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from '../../../services/context/context.service';
import { PairService } from '../../pair/services/pair.service';
import { FarmService } from '../services/farm.service';
import { AbiFarmService } from '../services/abi-farm.service';
import { AbiFarmServiceMock } from '../mocks/abi.farm.service.mock';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../../services/elrond-communication/elrond.api.service.mock';
import { RewardsModel } from '../models/farm.model';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { ContextServiceMock } from '../../../services/context/mocks/context.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../services/farm.getter.service';
import { FarmComputeService } from '../services/farm.compute.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { farmVersion } from 'src/utils/farm.utils';
import {
    BigUIntType,
    BigUIntValue,
    BinaryCodec,
    TypedValue,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import BigNumber from 'bignumber.js';

describe('FarmService', () => {
    let service: FarmService;

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

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
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
                ContextServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                PriceFeedServiceProvider,
                WrapServiceProvider,
                FarmService,
            ],
        }).compile();

        service = module.get<FarmService>(FarmService);
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
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
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

    it('should get farms', async () => {
        const farms = await service.getFarms();
        expect(farms).toEqual([
            {
                address:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                rewardType: undefined,
                version: 'v1.2',
            },
            {
                address: 'farm_address_2',
                rewardType: 'unlockedRewards',
                version: 'v1.3',
            },
            {
                address: 'farm_address_3',
                rewardType: 'lockedRewards',
                version: 'v1.3',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                rewardType: 'customRewards',
                version: 'v1.3',
            },
        ]);
    });

    it('should check if farm token', async () => {
        const isFarmToken_0 = await service.isFarmToken('FMT-4321');
        expect(isFarmToken_0).toEqual(false);

        const isFarmToken_1 = await service.isFarmToken('FMT-1234');
        expect(isFarmToken_1).toEqual(true);
    });

    it('should get farm address by farm token ID', async () => {
        const farmAddress = await service.getFarmAddressByFarmTokenID(
            'FMT-1234',
        );
        expect(farmAddress).toEqual(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
    });

    // RangeError: Attempt to access memory outside buffer boundsRangeError
    // [ERR_BUFFER_OUT_OF_BOUNDS]: Attempt to access memory outside buffer bounds
    /*it('should get batch rewards for position', async () => {
        const batchRewardsForPosition = await service.getBatchRewardsForPosition(
            [
                {
                    farmAddress:
                        'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                    liquidity: '1000',
                    identifier: '',
                    attributes: '',
                    vmQuery: true,
                },
            ],
        );
        expect(batchRewardsForPosition).toEqual('...');
    });

    it('should get tokens for exit farm', async () => {
        const tokensForExitFarm = await service.getTokensForExitFarm({
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            liquidity: '1000',
            identifier: '',
            attributes: '',
            vmQuery: true,
        });
        expect(tokensForExitFarm).toEqual('...');
    });*/

    /*it('should get tokens for exit farm', async () => {
        const farmAddress =
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye';
        const version = farmVersion(farmAddress);

        const attributes = new FarmTokenAttributesModel({
            //identifier: "",
            //attributes: "",
            rewardPerShare: '100',
            originalEnteringEpoch: 100,
            enteringEpoch: 100,
            //aprMultiplier: 10,
            //lockedRewards: true,
            initialFarmingAmount: '100',
            compoundedReward: '100',
            currentFarmAmount: '100',
        });
        
        const attributesEncoded: TypedValue[] = [
            new BigUIntValue(new BigNumber(100)),
            new U64Value(new BigNumber(100)),
            new U64Value(new BigNumber(100)),
            new BigUIntValue(new BigNumber(100)),
            new BigUIntValue(new BigNumber(100)),
        ];

        const codec = new BinaryCodec();

        const tokensForExitFarm = await service.decodeFarmTokenAttributes(
            farmAddress,
            '',
            attributesEncoded,
        );
        expect(tokensForExitFarm).toEqual('...');
    });*/

    /*
    it('should get require owner error', async () => {
        const tokensForExitFarm = await service.requireOwner({
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            liquidity: '1000',
            identifier: '',
            attributes: '',
            vmQuery: true,
        });
        expect(tokensForExitFarm).toEqual('...');
    });
    */
});

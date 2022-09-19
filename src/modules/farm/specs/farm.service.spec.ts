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
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.mock';

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
                RouterGetterServiceProvider,
                TokenGetterServiceProvider,
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
        const isFarmToken_0 = await service.isFarmToken('TOK1TOK9LPStaked');
        expect(isFarmToken_0).toEqual(false);

        const isFarmToken_1 = await service.isFarmToken('TOK1TOK4LPStaked');
        expect(isFarmToken_1).toEqual(true);
    });

    it('should get farm address by farm token ID', async () => {
        const farmAddress = await service.getFarmAddressByFarmTokenID(
            'TOK1TOK4LPStaked',
        );
        expect(farmAddress).toEqual(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
    });

    it('should get batch rewards for position', async () => {
        const batchRewardsForPosition = await service.getBatchRewardsForPosition(
            [
                {
                    farmAddress:
                        'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                    liquidity: '1000000000000000',
                    identifier: 'EGLDMEXFL-a329b6-0b',
                    attributes:
                        'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
                    vmQuery: false,
                },
            ],
        );
        expect(batchRewardsForPosition).toEqual([
            {
                decodedAttributes: {
                    aprMultiplier: null,
                    attributes:
                        'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
                    compoundedReward: '0',
                    currentFarmAmount: '1256235401928812748',
                    enteringEpoch: 1045,
                    identifier: 'EGLDMEXFL-a329b6-0b',
                    initialFarmingAmount: '1256235401928812748',
                    lockedRewards: null,
                    originalEnteringEpoch: 1045,
                    rewardPerShare: '0',
                },
                remainingFarmingEpochs: 1047,
                rewards: '110000000000000000150000000000',
            },
        ]);
    });

    it('should get tokens for exit farm', async () => {
        const tokensForExitFarm = await service.getTokensForExitFarm({
            farmAddress:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            liquidity: '1000000000000000',
            identifier: 'EGLDMEXFL-a329b6-0b',
            attributes:
                'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
            vmQuery: false,
        });
        expect(tokensForExitFarm).toEqual({
            farmingTokens: '999000000000000',
            rewards: '110000000000000000150000000000',
        });
    });

    it('should get tokens for exit farm', async () => {
        const tokensForExitFarm = await service.decodeFarmTokenAttributes(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            'EGLDMEXFL-a329b6-0b',
            'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
        );
        expect(tokensForExitFarm).toEqual({
            aprMultiplier: null,
            attributes:
                'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
            compoundedReward: '0',
            currentFarmAmount: '1256235401928812748',
            enteringEpoch: 1045,
            identifier: 'EGLDMEXFL-a329b6-0b',
            initialFarmingAmount: '1256235401928812748',
            lockedRewards: null,
            originalEnteringEpoch: 1045,
            rewardPerShare: '0',
        });
    });
});

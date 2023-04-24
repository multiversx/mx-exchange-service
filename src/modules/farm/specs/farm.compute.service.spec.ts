import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { AbiFarmServiceProvider } from '../mocks/abi.farm.service.mock';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { MXApiServiceMock } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { ContextGetterServiceProvider } from '../../../services/context/mocks/context.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { FarmGetterServiceV1_2 } from '../v1.2/services/farm.v1.2.getter.service';
import { FarmGetterServiceMockV1_2 } from '../mocks/farm.v1.2.getter.service.mock';
import { CalculateRewardsArgs } from '../models/farm.args';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';

describe('FarmService', () => {
    let service: FarmComputeServiceV1_2;
    let tokenCompute: TokenComputeService;

    const MXApiServiceProvider = {
        provide: MXApiService,
        useClass: MXApiServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiFarmServiceProvider,
                {
                    provide: FarmGetterServiceV1_2,
                    useClass: FarmGetterServiceMockV1_2,
                },
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterGetterServiceProvider,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
                FarmComputeServiceV1_2,
            ],
        }).compile();

        service = module.get<FarmComputeServiceV1_2>(FarmComputeServiceV1_2);
        tokenCompute = module.get<TokenComputeService>(TokenComputeService);
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
        expect(farmingTokenPriceUSD).toEqual('2');
    });

    it('should compute farm rewards for position', async () => {
        const calculateRewardsArgs = new CalculateRewardsArgs();
        calculateRewardsArgs.farmAddress =
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye';
        calculateRewardsArgs.liquidity = '100000000000000000000000000000';
        const farmRewardsForPosition =
            await service.computeFarmRewardsForPosition(
                calculateRewardsArgs,
                '100',
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

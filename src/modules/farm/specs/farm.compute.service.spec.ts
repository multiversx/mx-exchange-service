import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { ContextGetterServiceProvider } from '../../../services/context/mocks/context.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { CalculateRewardsArgs } from '../models/farm.args';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from '../mocks/farm.v1.2.abi.service.mock';
import { FarmServiceV1_2 } from '../v1.2/services/farm.v1.2.service';
import { Address } from '@multiversx/sdk-core/out';

describe('FarmService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
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
                FarmComputeServiceV1_2,
                FarmAbiServiceProviderV1_2,
                FarmServiceV1_2,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        expect(service).toBeDefined();
    });

    it('should compute farmed token price USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const farmedTokenPriceUSD = await service.computeFarmedTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(farmedTokenPriceUSD).toEqual('10');
    });

    it('should compute farming token price USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const farmingTokenPriceUSD = await service.computeFarmingTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(farmingTokenPriceUSD).toEqual('2');
    });

    it('should compute farm rewards for position', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const calculateRewardsArgs = new CalculateRewardsArgs();
        calculateRewardsArgs.farmAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000021',
        ).bech32();
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
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const anualRewardsUSD = await service.computeAnualRewardsUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(anualRewardsUSD).toEqual('52560000');
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { TokenComputeService } from '../services/token.compute.service';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenGetterServiceProvider } from '../mocks/token.getter.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { tokenProviderUSD } from 'src/config';

describe('TokenComputeService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                WrapAbiServiceProvider,
                TokenGetterServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                ContextGetterServiceProvider,
                TokenComputeService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        expect(service).toBeDefined();
    });

    it('should compute token price derived EGLD for tokenProviderUSD', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD(
            tokenProviderUSD,
        );
        expect(price).toEqual('1');
    });

    it('should compute token price derived EGLD for MEX-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD('MEX-123456');
        expect(price).toEqual('0.5');
    });

    it('should compute token price derived EGLD for TOK4-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD('TOK4-123456');
        expect(price).toEqual('20');
    });
});

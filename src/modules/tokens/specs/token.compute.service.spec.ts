import { Test, TestingModule } from '@nestjs/testing';
import { TokenComputeService } from '../services/token.compute.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenServiceProvider } from '../mocks/token.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { tokenProviderUSD } from 'src/config';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { CacheModule } from '@nestjs/cache-manager';
import { CachingService } from 'src/services/caching/cache.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('TokenComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                CacheModule.register(),
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                ContextGetterServiceProvider,
                TokenComputeService,
                CachingService,
                ApiConfigService,
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
        expect(price).toEqual('0.001');
    });

    it('should compute token price derived EGLD for TOK4-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD('TOK4-123456');
        expect(price).toEqual('0.01');
    });
});

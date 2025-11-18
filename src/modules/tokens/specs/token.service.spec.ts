import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../services/token.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { TokenRepositoryServiceProvider } from '../mocks/token.repository.service.mock';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { TokenComputeServiceProvider } from '../mocks/token.compute.service.mock';
import { TokenFilteringService } from '../services/token.filtering.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { TokenPersistenceServiceProvider } from 'src/modules/persistence/mocks/token.persistence.service.mock';
import { PairPersistenceServiceProvider } from 'src/modules/persistence/mocks/pair.persistence.service.mock';

describe('TokenService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                TokenRepositoryServiceProvider,
                MXApiServiceProvider,
                TokenService,
                ApiConfigService,
                TokenComputeServiceProvider,
                TokenFilteringService,
                ContextGetterServiceProvider,
                TokenPersistenceServiceProvider,
                PairPersistenceServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: TokenService = module.get<TokenService>(TokenService);
        expect(service).toBeDefined();
    });

    it('should get token metadata', async () => {
        const service: TokenService = module.get<TokenService>(TokenService);
        const tokenID = 'WEGLD-123456';
        const expectedToken = Tokens(tokenID);

        const token = await service.tokenMetadata(tokenID);
        expect(token).toEqual(expectedToken);
    });

    it('should get multiple tokens metadata', async () => {
        const service: TokenService = module.get<TokenService>(TokenService);
        const expectedTokens = [Tokens('WEGLD-123456'), Tokens('MEX-123456')];

        const token = await service.getAllTokensMetadata([
            'WEGLD-123456',
            'MEX-123456',
        ]);
        expect(token).toEqual(expectedTokens);
    });

    it('should get correctly handle duplication of multiple tokens', async () => {
        const service: TokenService = module.get<TokenService>(TokenService);
        const expectedToken = Tokens('WEGLD-123456');

        const token = await service.getAllTokensMetadata([
            'WEGLD-123456',
            'WEGLD-123456',
        ]);
        expect(token).toEqual([expectedToken, expectedToken]);
    });
});

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
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { TokenComputeServiceProvider } from '../mocks/token.compute.service.mock';
import { TokenFilteringService } from '../services/token.filtering.service';

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
                RouterAbiServiceProvider,
                TokenRepositoryServiceProvider,
                MXApiServiceProvider,
                TokenService,
                ApiConfigService,
                TokenComputeServiceProvider,
                TokenFilteringService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: TokenService = module.get<TokenService>(TokenService);
        expect(service).toBeDefined();
    });

    it('should get token metadata', async () => {
        const service: TokenService = module.get<TokenService>(TokenService);
        const apiService = module.get<MXApiService>(MXApiService);
        const cachingService = module.get<CacheService>(CacheService);

        const tokenID = 'WEGLD-123456';
        const expectedToken = Tokens(tokenID);
        const cacheKey = `token.tokenMetadata.${tokenID}`;
        await cachingService.deleteInCache(cacheKey);

        let token = await service.tokenMetadata(tokenID);
        expect(token).toEqual(expectedToken);

        jest.spyOn(apiService, 'getToken').mockResolvedValueOnce(undefined);
        await cachingService.deleteInCache(cacheKey);
        token = await service.tokenMetadata(tokenID);
        expect(token).toEqual(undefined);

        token = await service.tokenMetadata(tokenID);
        expect(token).toEqual(expectedToken);
    });
});

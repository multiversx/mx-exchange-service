import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../services/token.service';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { CachingService } from 'src/services/caching/cache.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { TokenRepositoryServiceProvider } from '../mocks/token.repository.service.mock';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';

describe('TokenService', () => {
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
                RouterAbiServiceProvider,
                TokenRepositoryServiceProvider,
                MXApiServiceProvider,
                TokenService,
                CachingService,
                ApiConfigService,
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
        const cachingService = module.get<CachingService>(CachingService);

        const tokenID = 'WEGLD-123456';
        const expectedToken = Tokens(tokenID);
        const cacheKey = `token.${tokenID}`;
        await cachingService.deleteInCache(cacheKey);

        let token = await service.getTokenMetadata(tokenID);
        expect(token).toEqual(expectedToken);

        jest.spyOn(apiService, 'getToken').mockResolvedValueOnce(undefined);
        await cachingService.deleteInCache(cacheKey);
        token = await service.getTokenMetadata(tokenID);
        expect(token).toEqual(undefined);

        token = await service.getTokenMetadata(tokenID);
        expect(token).toEqual(expectedToken);
    });
});

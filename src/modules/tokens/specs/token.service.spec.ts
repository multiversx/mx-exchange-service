import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../services/token.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { CacheService } from 'src/services/caching/cache.service';
import { TokensStateServiceProvider } from 'src/modules/state/mocks/tokens.state.service.mock';

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
                MXApiServiceProvider,
                TokenService,
                TokensStateServiceProvider,
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
    });

    it('should get token metadata from state rpc', async () => {
        const service: TokenService = module.get<TokenService>(TokenService);

        const tokenID = 'WEGLD-123456';
        const expectedToken = Tokens(tokenID);

        const token = await service.tokenMetadataFromState(tokenID);
        expect(token).toEqual(expectedToken);
    });
});

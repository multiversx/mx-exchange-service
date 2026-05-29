import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { scAddress } from 'src/config';
import { MXProxyService } from '../mx.proxy.service';

describe('MXProxyService', () => {
    let service: MXProxyService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [MXProxyService, ApiConfigService],
        }).compile();

        service = module.get<MXProxyService>(MXProxyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('getProxyDexAbi returns version-specific ABIs for v1 and v2', async () => {
        const v1Abi = await service.getProxyDexAbi(
            scAddress.proxyDexAddress.v1,
        );
        const v2Abi = await service.getProxyDexAbi(
            scAddress.proxyDexAddress.v2,
        );

        expect(v1Abi).not.toBe(v2Abi);

        // Endpoints that exist only in their respective ABI version.
        expect(v1Abi.getEndpoint('getLockedAssetTokenId')).toBeDefined();
        expect(v2Abi.getEndpoint('getLockedTokenIds')).toBeDefined();

        // The cross-version endpoints must NOT resolve, proving each version
        // received its own ABI rather than a cached collision.
        expect(() => v1Abi.getEndpoint('getLockedTokenIds')).toThrow();
        expect(() => v2Abi.getEndpoint('getLockedAssetTokenId')).toThrow();
    });
});

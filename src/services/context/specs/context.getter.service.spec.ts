import { Test, TestingModule } from '@nestjs/testing';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { ElrondApiService } from 'src/services/elrond-communication/services/elrond-api.service';
import { ContextGetterService } from '../context.getter.service';

describe('ContextService', () => {
    let service: ContextGetterService;
    let apiService: ElrondApiService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CommonAppModule,
                CachingModule,
                ElrondCommunicationModule,
            ],
            providers: [ContextGetterService],
        }).compile();

        service = module.get<ContextGetterService>(ContextGetterService);
        apiService = module.get<ElrondApiService>(ElrondApiService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should not get esdt token', async () => {
        jest.spyOn(apiService, 'doGetGeneric').mockImplementation(
            async (name: string, resourceUrl: string) => {
                if (resourceUrl.includes('tokens')) {
                    return {
                        collection: 'FMT-1234',
                        type: 'MetaESDT',
                        name: 'FarmToken',
                        ticker: 'FMT',
                        owner:
                            'erd1qqqqqqqqqqqqqpgq45zs77q884ts6y9zj4jyqfn6ydev8ruv2jps3tteqq',
                        timestamp: 1652272008,
                        canFreeze: true,
                        canWipe: true,
                        canPause: true,
                        canTransferNftCreateRole: false,
                        decimals: 18,
                    };
                }
            },
        );

        const esdtToken = await service.getTokenMetadata('USDC-c76f1f');
        expect(esdtToken).toEqual(undefined);
    });
});

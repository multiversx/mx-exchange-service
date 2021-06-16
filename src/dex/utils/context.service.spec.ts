import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { ContextService } from './context.service';
import { ElrondApiServiceMock } from './context.test-mocks';

describe('ContextService', () => {
    let service: ContextService;

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CacheManagerModule],
            providers: [ElrondApiServiceProvider, ContextService],
        }).compile();

        service = module.get<ContextService>(ContextService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get pairs graph', async () => {
        const pairsMap = await service.getPairsMap();

        const expectedMap = new Map();
        expectedMap.set('WEGLD-b9cba1', ['MEX-bd9937', 'BUSD-fd5ddb']);
        expectedMap.set('MEX-bd9937', ['WEGLD-b9cba1']);
        expectedMap.set('BUSD-fd5ddb', ['WEGLD-b9cba1']);

        expect(pairsMap).toEqual(expectedMap);
    });

    it('should get path between tokens', async () => {
        let path = await service.getPath('MEX-bd9937', 'WEGLD-b9cba1');
        expect(path).toEqual(['MEX-bd9937', 'WEGLD-b9cba1']);

        path = await service.getPath('BUSD-fd5ddb', 'WEGLD-b9cba1');
        expect(path).toEqual(['BUSD-fd5ddb', 'WEGLD-b9cba1']);

        path = await service.getPath('MEX-bd9937', 'BUSD-fd5ddb');
        expect(path).toEqual(['MEX-bd9937', 'WEGLD-b9cba1', 'BUSD-fd5ddb']);
    });

    it('should not get a path between tokens', async () => {
        const path = await service.getPath('MEX-bd9937', 'SPT-1111');
        expect(path).toEqual([]);
    });
});

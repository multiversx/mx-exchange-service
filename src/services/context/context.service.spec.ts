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
        expectedMap.set('WEGLD-88600a', ['MEX-b6bb7d', 'BUSD-05b16f']);
        expectedMap.set('MEX-b6bb7d', ['WEGLD-88600a']);
        expectedMap.set('BUSD-05b16f', ['WEGLD-88600a']);

        expect(pairsMap).toEqual(expectedMap);
    });

    it('should get path between tokens', async () => {
        let path = await service.getPath('MEX-b6bb7d', 'WEGLD-88600a');
        expect(path).toEqual(['MEX-b6bb7d', 'WEGLD-88600a']);

        path = await service.getPath('BUSD-05b16f', 'WEGLD-88600a');
        expect(path).toEqual(['BUSD-05b16f', 'WEGLD-88600a']);

        path = await service.getPath('MEX-b6bb7d', 'BUSD-05b16f');
        expect(path).toEqual(['MEX-b6bb7d', 'WEGLD-88600a', 'BUSD-05b16f']);
    });

    it('should not get a path between tokens', async () => {
        const path = await service.getPath('MEX-b6bb7d', 'SPT-1111');
        expect(path).toEqual([]);
    });
});

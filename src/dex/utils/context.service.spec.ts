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
        expectedMap.set('WXEGLD-da3f24', ['MEX-531623', 'BUSD-2e8fee']);
        expectedMap.set('MEX-531623', ['WXEGLD-da3f24']);
        expectedMap.set('BUSD-2e8fee', ['WXEGLD-da3f24']);

        expect(pairsMap).toEqual(expectedMap);
    });

    it('should get path between tokens', async () => {
        let path = await service.getPath('MEX-531623', 'WXEGLD-da3f24');
        expect(path).toEqual(['MEX-531623', 'WXEGLD-da3f24']);

        path = await service.getPath('BUSD-2e8fee', 'WXEGLD-da3f24');
        expect(path).toEqual(['BUSD-2e8fee', 'WXEGLD-da3f24']);

        path = await service.getPath('MEX-531623', 'BUSD-2e8fee');
        expect(path).toEqual(['MEX-531623', 'WXEGLD-da3f24', 'BUSD-2e8fee']);
    });

    it('should not get a path between tokens', async () => {
        const path = await service.getPath('MEX-531623', 'SPT-1111');
        expect(path).toEqual([]);
    });
});

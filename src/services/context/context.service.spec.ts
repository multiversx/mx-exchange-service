import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from './context.service';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';
import { RouterModule } from '../../modules/router/router.module';
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../caching/cache.module';

describe('ContextService', () => {
    let service: ContextService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CommonAppModule,
                CachingModule,
                ElrondCommunicationModule,
                RouterModule,
            ],
            providers: [ContextService],
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

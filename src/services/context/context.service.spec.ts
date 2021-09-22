import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from './context.service';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';
import { RouterModule } from '../../modules/router/router.module';
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../caching/cache.module';
import { AbiRouterService } from '../../modules/router/abi.router.service';
import { pairsMetadata } from './context.service.mocks';

describe('ContextService', () => {
    let service: ContextService;
    let abiRouterService: AbiRouterService;

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
        abiRouterService = module.get<AbiRouterService>(AbiRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get pairs graph', async () => {
        jest.spyOn(abiRouterService, 'getPairsMetadata').mockImplementation(
            async () => {
                return pairsMetadata;
            },
        );
        const pairsMap = await service.getPairsMap();

        const expectedMap = new Map();
        expectedMap.set('WEGLD-073650', ['MEX-ec32fa', 'BUSD-f2c46d']);
        expectedMap.set('MEX-ec32fa', ['WEGLD-073650']);
        expectedMap.set('BUSD-f2c46d', ['WEGLD-073650']);

        expect(pairsMap).toEqual(expectedMap);
    });

    it('should get path between tokens', async () => {
        let path: string[] = [];
        let discovered = new Map<string, boolean>();
        const graph = await service.getPairsMap();

        service.isConnected(
            graph,
            'MEX-ec32fa',
            'WEGLD-073650',
            discovered,
            path,
        );
        expect(path).toEqual(['MEX-ec32fa', 'WEGLD-073650']);

        path = [];
        discovered = new Map<string, boolean>();
        service.isConnected(
            graph,
            'BUSD-f2c46d',
            'WEGLD-073650',
            discovered,
            path,
        );
        expect(path).toEqual(['BUSD-f2c46d', 'WEGLD-073650']);

        path = [];
        discovered = new Map<string, boolean>();
        service.isConnected(
            graph,
            'MEX-ec32fa',
            'BUSD-f2c46d',
            discovered,
            path,
        );
        expect(path).toEqual(['MEX-ec32fa', 'WEGLD-073650', 'BUSD-f2c46d']);
    });

    it('should not get a path between tokens', async () => {
        const path: string[] = [];
        const discovered = new Map<string, boolean>();
        const graph = await service.getPairsMap();
        service.isConnected(graph, 'MEX-ec32fa', 'SPT-1111', discovered, path);
        expect(path).toEqual([]);
    });
});

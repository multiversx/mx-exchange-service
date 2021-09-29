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
        expectedMap.set('TOK1-1111', ['TOK2-2222', 'TOK3-3333']);
        expectedMap.set('TOK2-2222', ['TOK1-1111']);
        expectedMap.set('TOK3-3333', ['TOK1-1111']);

        expect(pairsMap).toEqual(expectedMap);
    });

    it('should get path between tokens', async () => {
        let path: string[] = [];
        let discovered = new Map<string, boolean>();
        const graph = await service.getPairsMap();

        service.isConnected(graph, 'TOK2-2222', 'TOK1-1111', discovered, path);
        expect(path).toEqual(['TOK2-2222', 'TOK1-1111']);

        path = [];
        discovered = new Map<string, boolean>();
        service.isConnected(graph, 'TOK3-3333', 'TOK1-1111', discovered, path);
        expect(path).toEqual(['TOK3-3333', 'TOK1-1111']);

        path = [];
        discovered = new Map<string, boolean>();
        service.isConnected(graph, 'TOK2-2222', 'TOK3-3333', discovered, path);
        expect(path).toEqual(['TOK2-2222', 'TOK1-1111', 'TOK3-3333']);
    });

    it('should not get a path between tokens', async () => {
        const path: string[] = [];
        const discovered = new Map<string, boolean>();
        const graph = await service.getPairsMap();
        service.isConnected(graph, 'TOK2-2222', 'SPT-1111', discovered, path);
        expect(path).toEqual([]);
    });
});

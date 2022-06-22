import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from '../context.service';
import { ElrondCommunicationModule } from '../../elrond-communication/elrond-communication.module';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../caching/cache.module';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { RouterGetterServiceMock } from 'src/modules/router/mocks/router.getter.service.mock';

describe('ContextService', () => {
    let service: ContextService;

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CommonAppModule,
                CachingModule,
                ElrondCommunicationModule,
            ],
            providers: [RouterGetterServiceProvider, ContextService],
        }).compile();

        service = module.get<ContextService>(ContextService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get pairs graph', async () => {
        const pairsMap = await service.getPairsMap();

        const expectedMap = new Map();
        expectedMap.set('TOK1-1111', ['TOK2-2222', 'USDC-1111']);
        expectedMap.set('TOK2-2222', ['TOK1-1111']);
        expectedMap.set('USDC-1111', ['TOK1-1111']);

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
        service.isConnected(graph, 'USDC-1111', 'TOK1-1111', discovered, path);
        expect(path).toEqual(['USDC-1111', 'TOK1-1111']);

        path = [];
        discovered = new Map<string, boolean>();
        service.isConnected(graph, 'TOK2-2222', 'USDC-1111', discovered, path);
        expect(path).toEqual(['TOK2-2222', 'TOK1-1111', 'USDC-1111']);
    });

    it('should not get a path between tokens', async () => {
        const path: string[] = [];
        const discovered = new Map<string, boolean>();
        const graph = await service.getPairsMap();
        service.isConnected(graph, 'TOK2-2222', 'SPT-1111', discovered, path);
        expect(path).toEqual([]);
    });
});

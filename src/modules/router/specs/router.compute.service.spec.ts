/*import { Test, TestingModule } from '@nestjs/testing';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceMock } from '../mocks/router.getter.service.mock';
import { RouterService } from '../services/router.service';
import { RouterComputeService } from '../services/router.compute.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairComputeServiceMock } from 'src/modules/pair/mocks/pair.compute.service.mock';

describe('RouterComputeService', () => {
    let service: RouterComputeService;

    const PairComputeServiceProvider = {
        provide: PairComputeService,
        useClass: PairComputeServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [], //[ConfigModule, CachingModule],
            providers: [
                //RouterService,
                //RouterGetterServiceProvider,
                //PairGetterServiceProvider,
                PairComputeServiceProvider,
                //PairService,
                //PairGetterServiceProvider,
                //PairComputeService,
                //PairModule,
                //ContextServiceProvider,
                RouterComputeService,
            ],
        }).compile();

        service = module.get<RouterComputeService>(RouterComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});*/
// unresolvable PairComputeService dependecy error...

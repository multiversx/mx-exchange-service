import { Test, TestingModule } from '@nestjs/testing';
import { RouterService } from '../services/router.service';
import { PairFilterArgs } from '../models/filter.args';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { RouterAbiServiceProvider } from '../mocks/router.abi.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { Address } from '@multiversx/sdk-core/out';

describe('RouterService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CachingModule],
            providers: [
                PairAbiServiceProvider,
                RouterAbiServiceProvider,
                RouterService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<RouterService>(RouterService);
        expect(service).toBeDefined();
    });

    it('should get all pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const allPairs = await service.getAllPairs(
            0,
            Number.MAX_VALUE,
            new PairFilterArgs(),
        );
        expect(allPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000014',
                ).bech32(),
            }),
        ]);
    });

    it('should get filtered pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'WEGLD-123456',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            }),
            new PairModel({
                address: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).bech32(),
            }),
        ]);
    });
});

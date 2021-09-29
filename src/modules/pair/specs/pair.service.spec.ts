import { Test, TestingModule } from '@nestjs/testing';
import { PairAbiService } from '../services/pair.abi.service';
import { PairService } from '../services/pair.service';
import { ContextService } from 'src/services/context/context.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextServiceMock } from 'src/services/context/context.service.mocks';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairAbiServiceMock } from '../mocks/pair.abi.service.mock';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceMock } from '../mocks/pair.getter.service.mock';

describe('PairService', () => {
    let service: PairService;

    const PairAbiServiceProvider = {
        provide: PairAbiService,
        useClass: PairAbiServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                PairAbiServiceProvider,
                PairGetterServiceProvider,
                ContextServiceProvider,
                PairService,
                WrapServiceProvider,
            ],
        }).compile();

        service = module.get<PairService>(PairService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get all temporary funds for user', async () => {
        const allTemporaryFunds = await service.getTemporaryFunds(
            'user_address_1',
        );
        expect(allTemporaryFunds[0]).toEqual({
            pairAddress: 'pair_address_1',
            firstToken: {
                identifier: 'TOK1-1111',
                name: 'FirstToken',
                owner: 'owner_address',
                minted: '1000000000000000000',
                burnt: '0',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            },
            firstAmount: '100',
            secondToken: {
                identifier: 'TOK2-2222',
                name: 'SecondToken',
                owner: 'owner_address',
                minted: '2000000000000000000',
                burnt: '0',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            },
            secondAmount: '100',
        });
    });

    it('should get liquidity position from pair', async () => {
        const liquidityPosition = await service.getLiquidityPosition(
            'pair_address_1',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '2',
        });
    });
});

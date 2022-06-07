import { Test, TestingModule } from '@nestjs/testing';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { TransactionRouterService } from '../services/transactions.router.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceMock } from '../mocks/router.getter.service.mock';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { RouterService } from '../services/router.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { PairFilterArgs } from '../models/filter.args';
import { Address } from '@elrondnetwork/erdjs/out';

describe('RouterService', () => {
    let service: TransactionRouterService;

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                ConfigModule,
                CachingModule,
            ],
            providers: [
                ContextServiceProvider,
                ContextGetterServiceProvider,
                PairGetterServiceProvider,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                TransactionsWrapService,
                ContextTransactionsService,
                ApiConfigService,
                ElrondProxyService,
                TransactionRouterService,
                RouterService,
            ],
        }).compile();

        service = module.get<TransactionRouterService>(
            TransactionRouterService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get create pair transaction', async () => {
        const createPairTransaction = await service.createPair(
            Address.Zero().bech32(),
            'TOK3-3333',
            'TOK4-4444',
        );
        expect(createPairTransaction.data).toEqual(
            'Y3JlYXRlUGFpckA1NDRmNGIzMzJkMzMzMzMzMzNANTQ0ZjRiMzQyZDM0MzQzNDM0QDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
        );
    });

    it('should get issue LP token transaction', async () => {
        const issueLpTokenTransaction = await service.issueLpToken(
            'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
            'LiquidityPoolToken3',
            'LPT-3333',
        );
        expect(issueLpTokenTransaction.data).toEqual(
            'aXNzdWVMcFRva2VuQDg2N2JhODkyYmVlNTM0NTljMjI2YTZjMTI0ZDU5MzIyMjY1NzVlZDZmMDc0MzI1NDY5MDgwOGRkMGRiNGViNWFANGM2OTcxNzU2OTY0Njk3NDc5NTA2ZjZmNmM1NDZmNmI2NTZlMzNANGM1MDU0MmQzMzMzMzMzMw==',
        );
    });

    it('should get issue LP token duplication error', async () => {
        try {
            await service.issueLpToken(
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                'LiquidityPoolToken1',
                'LPT-1234',
            );
        } catch (error) {
            expect(error).toEqual(new Error('LP Token already issued'));
        }
    });

    it('should get set local roles transaction', async () => {
        const setLocalRolesTransaction = await service.setLocalRoles(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(setLocalRolesTransaction.data).toEqual(
            'c2V0TG9jYWxSb2xlc0AwMDAwMDAwMDAwMDAwMDAwMDUwMGM5ZjY1NzdiMGM1NjZjZGMyOGUwYTc2ZjZlMTRkMWJlMDc5NDAwMzM3Y2Vi',
        );
    });

    it('should get set pause state transaction', async () => {
        const setStateTransaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            false,
        );
        expect(setStateTransaction.data).toEqual(
            'cGF1c2VAMDAwMDAwMDAwMDAwMDAwMDA1MDBjOWY2NTc3YjBjNTY2Y2RjMjhlMGE3NmY2ZTE0ZDFiZTA3OTQwMDMzN2NlYg==',
        );
    });

    it('should get set resume state transaction', async () => {
        const setStateTransaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(setStateTransaction.data).toEqual(
            'cmVzdW1lQDAwMDAwMDAwMDAwMDAwMDAwNTAwYzlmNjU3N2IwYzU2NmNkYzI4ZTBhNzZmNmUxNGQxYmUwNzk0MDAzMzdjZWI=',
        );
    });

    it('should get set resume state transaction', async () => {
        const setStateTransaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(setStateTransaction.data).toEqual(
            'cmVzdW1lQDAwMDAwMDAwMDAwMDAwMDAwNTAwYzlmNjU3N2IwYzU2NmNkYzI4ZTBhNzZmNmUxNGQxYmUwNzk0MDAzMzdjZWI=',
        );
    });

    it('should get set fee OFF transaction', async () => {
        const setFeeTransaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            false,
        );
        expect(setFeeTransaction.data).toEqual(
            'c2V0RmVlT2ZmQDAwMDAwMDAwMDAwMDAwMDAwNTAwYzlmNjU3N2IwYzU2NmNkYzI4ZTBhNzZmNmUxNGQxYmUwNzk0MDAzMzdjZWJAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEA1NDRmNGIzMTJkMzEzMTMxMzE=',
        );
    });

    it('should get set fee ON transaction', async () => {
        const setFeeTransaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            true,
        );
        expect(setFeeTransaction.data).toEqual(
            'c2V0RmVlT25AMDAwMDAwMDAwMDAwMDAwMDA1MDBjOWY2NTc3YjBjNTY2Y2RjMjhlMGE3NmY2ZTE0ZDFiZTA3OTQwMDMzN2NlYkAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwQDU0NGY0YjMxMmQzMTMxMzEzMQ==',
        );
    });
});

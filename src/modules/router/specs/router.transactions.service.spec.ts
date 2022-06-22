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
import { ConfigModule } from '@nestjs/config';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceMock } from '../mocks/router.getter.service.mock';
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
import { Address } from '@elrondnetwork/erdjs/out';
import { encodeTransactionData } from 'src/helpers/helpers';
import { EsdtLocalRole } from '../models/router.args';

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
        const transaction = await service.createPair(
            Address.Zero().bech32(),
            'TOK3-3333',
            'TOK4-4444',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'createPair@TOK3-3333@TOK4-4444@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
        );
    });

    it('should get issue LP token transaction', async () => {
        const transaction = await service.issueLpToken(
            'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
            'LiquidityPoolToken3',
            'LPT-3333',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'issueLpToken@erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2@LiquidityPoolToken3@LPT-3333',
            ),
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
        const transaction = await service.setLocalRoles(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setLocalRoles@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
        );
    });

    it('should get set pause state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            false,
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'pause@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
        );
    });

    it('should get set resume state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'resume@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
        );
    });

    it('should get set resume state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'resume@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
        );
    });

    it('should get set fee OFF transaction', async () => {
        const transaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            false,
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setFeeOff@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@TOK1-1111',
            ),
        );
    });

    it('should get set fee ON transaction', async () => {
        const transaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            true,
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setFeeOn@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@TOK1-1111',
            ),
        );
    });

    it('should get set local roles owner', async () => {
        const transaction = await service.setLocalRolesOwner({
            tokenID: 'TOK1-1111',
            address: Address.Zero().bech32(),
            roles: [EsdtLocalRole.None],
        });
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setLocalRolesOwner@TOK1-1111@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@',
            ),
        );
    });

    it('should get remove pair transaction', async () => {
        const transaction = await service.removePair('TOK1-1111', 'USDC-1111');
        expect(transaction.data).toMatch(
            encodeTransactionData('removePair@TOK1-1111@USDC-1111'),
        );
    });

    it('should get set pair creation enabled ON transaction', async () => {
        const transaction = await service.setPairCreationEnabled(true);
        expect(transaction.data).toMatch(
            encodeTransactionData('setPairCreationEnabled@1'),
        );
    });

    it('should get set pair creation enabled OFF transaction', async () => {
        const transaction = await service.setPairCreationEnabled(false);
        expect(transaction.data).toMatch(
            encodeTransactionData('setPairCreationEnabled@'),
        );
    });

    it('should get clear pair temporary owner storage transaction', async () => {
        const transaction = await service.clearPairTemporaryOwnerStorage();
        expect(transaction.data).toMatch(
            encodeTransactionData('clearPairTemporaryOwnerStorage'),
        );
    });

    it('should get set temporary owner period transaction', async () => {
        const transaction = await service.setTemporaryOwnerPeriod('1000');
        expect(transaction.data).toMatch(
            encodeTransactionData('setTemporaryOwnerPeriod@1000'),
        );
    });

    it('should get set set pair template address transaction', async () => {
        const transaction = await service.setPairTemplateAddress(
            Address.Zero().bech32(),
        );
        expect(transaction.data).toMatch(
            encodeTransactionData(
                'setPairTemplateAddress@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
        );
    });
});

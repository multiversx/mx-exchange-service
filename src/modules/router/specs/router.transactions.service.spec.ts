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
import { Address } from '@elrondnetwork/erdjs/out';
import { EsdtLocalRole, SetLocalRoleOwnerArgs } from '../models/router.args';
import { fail } from 'assert';

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
        const transaction = await service.createPair(
            Address.Zero().bech32(),
            'TOK3-3333',
            'TOK4-4444',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'createPair@544f4b332d33333333@544f4b342d34343434@0000000000000000000000000000000000000000000000000000000000000000',
        );
    });

    it('should get issue LP token transaction', async () => {
        const transaction = await service.issueLpToken(
            'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
            'LiquidityPoolToken3',
            'LPT-3333',
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'issueLpToken@867ba892bee53459c226a6c124d5932226575ed6f0743254690808dd0db4eb5a@4c6971756964697479506f6f6c546f6b656e33@4c50542d33333333',
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
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setLocalRoles@00000000000000000500c9f6577b0c566cdc28e0a76f6e14d1be079400337ceb',
        );
    });

    it('should get set pause state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            false,
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'pause@00000000000000000500c9f6577b0c566cdc28e0a76f6e14d1be079400337ceb',
        );
    });

    it('should get set resume state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'resume@00000000000000000500c9f6577b0c566cdc28e0a76f6e14d1be079400337ceb',
        );
    });

    it('should get set resume state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'resume@00000000000000000500c9f6577b0c566cdc28e0a76f6e14d1be079400337ceb',
        );
    });

    it('should get set fee OFF transaction', async () => {
        const transaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            false,
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setFeeOff@00000000000000000500c9f6577b0c566cdc28e0a76f6e14d1be079400337ceb@0000000000000000000000000000000000000000000000000000000000000000@544f4b312d31313131',
        );
    });

    it('should get set fee ON transaction', async () => {
        const transaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            true,
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setFeeOn@00000000000000000500c9f6577b0c566cdc28e0a76f6e14d1be079400337ceb@0000000000000000000000000000000000000000000000000000000000000000@544f4b312d31313131',
        );
    });

    it('should get set local roles owner', async () => {
        const transaction = await service.setLocalRolesOwner({
            tokenID: 'TOK1-1111',
            address: Address.Zero().bech32(),
            roles: [EsdtLocalRole.None],
        });
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setLocalRolesOwner@544f4b312d31313131@0000000000000000000000000000000000000000000000000000000000000000@',
        );
    });

    it('should get remove pair transaction', async () => {
        const transaction = await service.removePair('TOK1-1111', 'USDC-1111');
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'removePair@544f4b312d31313131@555344432d31313131',
        );
    });

    it('should get set pair creation enabled ON transaction', async () => {
        const transaction = await service.setPairCreationEnabled(true);
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setPairCreationEnabled@01',
        );
    });

    it('should get set pair creation enabled OFF transaction', async () => {
        const transaction = await service.setPairCreationEnabled(false);
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setPairCreationEnabled@',
        );
    });

    it('should get clear pair temporary owner storage transaction', async () => {
        const transaction = await service.clearPairTemporaryOwnerStorage();
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'clearPairTemporaryOwnerStorage',
        );
    });

    it('should get set temporary owner period transaction', async () => {
        const transaction = await service.setTemporaryOwnerPeriod('1000');
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setTemporaryOwnerPeriod@03e8',
        );
    });

    it('should get set set pair template address transaction', async () => {
        const transaction = await service.setPairTemplateAddress(
            Address.Zero().bech32(),
        );
        expect(Buffer.from(transaction.data, 'base64').toString()).toEqual(
            'setPairTemplateAddress@0000000000000000000000000000000000000000000000000000000000000000',
        );
    });
});

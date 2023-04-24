import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { TransactionRouterService } from '../services/transactions.router.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceStub } from '../mocks/router.getter.service.stub';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { RouterService } from '../services/router.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { Address } from '@multiversx/sdk-core';
import { encodeTransactionData } from 'src/helpers/helpers';
import { EsdtLocalRole } from '../models/router.args';
import { mxConfig, gasConfig } from 'src/config';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';

describe('RouterService', () => {
    let service: TransactionRouterService;

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceStub,
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
                ContextGetterServiceProvider,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                RouterGetterServiceProvider,
                WrapAbiServiceProvider,
                WrapService,
                WrapTransactionsService,
                ApiConfigService,
                MXProxyService,
                TransactionRouterService,
                TokenGetterServiceProvider,
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
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.createPair,
            data: encodeTransactionData(
                'createPair@TOK3-3333@TOK4-4444@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get issue LP token transaction', async () => {
        const transaction = await service.issueLpToken(
            'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
            'LiquidityPoolToken3',
            'LPT-3333',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '50000000000000000',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.issueToken,
            data: encodeTransactionData(
                'issueLpToken@erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2@LiquidityPoolToken3@LPT-3333',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get issue LP token duplication error', async () => {
        try {
            await service.issueLpToken(
                'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                'LiquidityPoolTokenT1T4',
                'TOK1TOK4LP',
            );
        } catch (error) {
            expect(error).toEqual(new Error('LP Token already issued'));
        }
    });

    it('should get set local roles transaction', async () => {
        const transaction = await service.setLocalRoles(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.setLocalRoles,
            data: encodeTransactionData(
                'setLocalRoles@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set pause state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setState,
            data: encodeTransactionData(
                'pause@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set resume state transaction', async () => {
        const transaction = await service.setState(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setState,
            data: encodeTransactionData(
                'resume@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set fee OFF transaction', async () => {
        const transaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setFee,
            data: encodeTransactionData(
                'setFeeOff@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@TOK1-1111',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set fee ON transaction', async () => {
        const transaction = await service.setFee(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            Address.Zero().bech32(),
            'TOK1-1111',
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setFee,
            data: encodeTransactionData(
                'setFeeOn@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@TOK1-1111',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set local roles owner', async () => {
        const transaction = await service.setLocalRolesOwner({
            tokenID: 'TOK1-1111',
            address: Address.Zero().bech32(),
            roles: [EsdtLocalRole.Mint],
        });
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setLocalRolesOwner,
            data: encodeTransactionData(
                'setLocalRolesOwner@TOK1-1111@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@01',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get remove pair transaction', async () => {
        const transaction = await service.removePair('TOK1-1111', 'USDC-1111');
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.removePair,
            data: encodeTransactionData('removePair@TOK1-1111@USDC-1111'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set pair creation enabled ON transaction', async () => {
        const transaction = await service.setPairCreationEnabled(true);
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setPairCreationEnabled,
            data: encodeTransactionData('setPairCreationEnabled@01'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set pair creation enabled OFF transaction', async () => {
        const transaction = await service.setPairCreationEnabled(false);
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setPairCreationEnabled,
            data: encodeTransactionData('setPairCreationEnabled@'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get clear pair temporary owner storage transaction', async () => {
        const transaction = await service.clearPairTemporaryOwnerStorage();
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: 200000000,
            data: 'Y2xlYXJQYWlyVGVtcG9yYXJ5T3duZXJTdG9yYWdl',
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set temporary owner period transaction', async () => {
        const transaction = await service.setTemporaryOwnerPeriod(
            '1000000000000000000000000000000000',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: 200000000,
            data: encodeTransactionData(
                'setTemporaryOwnerPeriod@1000000000000000000000000000000000',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set pair template address transaction', async () => {
        const transaction = await service.setPairTemplateAddress(
            Address.Zero().bech32(),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: 200000000,
            data: encodeTransactionData(
                'setPairTemplateAddress@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });
});

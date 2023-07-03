import { Test, TestingModule } from '@nestjs/testing';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { PairTransactionService } from '../services/pair.transactions.service';
import { PairService } from '../services/pair.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { Address } from '@multiversx/sdk-core';
import { encodeTransactionData } from 'src/helpers/helpers';
import { mxConfig, gasConfig } from 'src/config';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { PairAbiServiceProvider } from '../mocks/pair.abi.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairComputeServiceProvider } from '../mocks/pair.compute.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { CommonAppModule } from 'src/common.app.module';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('TransactionPairService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                ConfigService,
                ApiConfigService,
                MXProxyServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                WrapTransactionsService,
                WrapService,
                TokenGetterServiceProvider,
                PairTransactionService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        expect(service).toBeDefined();
    });

    it('should get add initial liquidity batch transaction', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const initialLiquidityBatchTransactions =
            await service.addInitialLiquidityBatch(Address.Zero().bech32(), {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokens: [
                    {
                        tokenID: 'MEX-123456',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            });

        const [wrapEgldTransaction, addLiquidityTransaction] =
            initialLiquidityBatchTransactions;

        expect(wrapEgldTransaction).toEqual({
            nonce: 0,
            value: secondTokenAmount,
            receiver:
                'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.wrapeGLD,
            data: encodeTransactionData('wrapEgld'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
        expect(addLiquidityTransaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.addLiquidity,
            data: encodeTransactionData(
                `MultiESDTNFTTransfer@${Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32()}@2@WEGLD-123456@@9@MEX-123456@@10@addInitialLiquidity`,
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get add initial liquidity transaction', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const addLiquidityTransaction = await service.addInitialLiquidity(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokens: [
                    {
                        tokenID: 'WEGLD-123456',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'MEX-123456',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );
        expect(addLiquidityTransaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.addLiquidity,
            data: encodeTransactionData(
                `MultiESDTNFTTransfer@${Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32()}@02@WEGLD-123456@@10@MEX-123456@@09@addInitialLiquidity`,
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get add liquidity transaction', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const addLiquidityTransaction = await service.addLiquidity(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokens: [
                    {
                        tokenID: 'MEX-123456',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        expect(addLiquidityTransaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.addLiquidity,
            data: encodeTransactionData(
                `MultiESDTNFTTransfer@${Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32()}@2@WEGLD-123456@@9@MEX-123456@@10@addLiquidity@8@9`,
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokens: [
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'MEX-123456',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );
        const [wrapEgldTransaction, addLiquidity] = liquidityBatchTransactions;

        expect(wrapEgldTransaction).toEqual({
            nonce: 0,
            value: '10',
            receiver:
                'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.wrapeGLD,
            data: encodeTransactionData('wrapEgld'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
        expect(addLiquidity).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.addLiquidity,
            data: encodeTransactionData(
                `MultiESDTNFTTransfer@${Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32()}@02@WEGLD-123456@@10@MEX-123456@@09@addLiquidity@09@08`,
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';

        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const liquidityBatchTransactions = await service.addLiquidityBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokens: [
                    {
                        tokenID: 'MEX-123456',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [wrapEgldTransaction, addLiquidity] = liquidityBatchTransactions;

        expect(wrapEgldTransaction).toEqual({
            nonce: 0,
            value: secondTokenAmount,
            receiver:
                'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.wrapeGLD,
            data: encodeTransactionData('wrapEgld'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
        expect(addLiquidity).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.addLiquidity,
            data: encodeTransactionData(
                `MultiESDTNFTTransfer@${Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32()}@02@WEGLD-123456@@09@MEX-123456@@10@addLiquidity@08@09`,
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get remove liquidity transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transactions = await service.removeLiquidity(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                liquidity: '9',
                liquidityTokenID: 'EGLD',
                tolerance: 0.01,
            },
        );

        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.pairs.removeLiquidity,
                data: encodeTransactionData(
                    'ESDTTransfer@1162300484@09@removeLiquidity@08@17',
                ),
                chainID: mxConfig.chainID,
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData(
                    'ESDTTransfer@WEGLD-123456@08@unwrapEgld',
                ),
                chainID: mxConfig.chainID,
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });

    it('should get swap tokens fixed input transaction + wrap tx', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transactions = await service.swapTokensFixedInput(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokenInID: 'EGLD',
                tokenOutID: 'MEX-123456',
                amountIn: '5',
                amountOut: '5',
                tolerance: 0.01,
            },
        );

        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '5',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData('wrapEgld'),
                chainID: mxConfig.chainID,
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.pairs.swapTokensFixedInput.default,
                data: encodeTransactionData(
                    'ESDTTransfer@WEGLD-123456@5@swapTokensFixedInput@MEX-123456@4',
                ),
                chainID: mxConfig.chainID,
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });

    it('should get swap tokens fixed output transaction + unwrap tx', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transactions = await service.swapTokensFixedOutput(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                tokenInID: 'MEX-123456',
                tokenOutID: 'EGLD',
                amountIn: '5',
                amountOut: '5',
            },
        );

        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.pairs.swapTokensFixedOutput.default,
                data: encodeTransactionData(
                    'ESDTTransfer@MEX-123456@05@swapTokensFixedOutput@WEGLD-123456@05',
                ),
                chainID: mxConfig.chainID,
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData(
                    'ESDTTransfer@WEGLD-123456@05@unwrapEgld',
                ),
                chainID: mxConfig.chainID,
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });

    it('should validate tokens', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transactions = await service.validateTokens(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            [
                new InputTokenModel({ tokenID: 'MEX-123456' }),
                new InputTokenModel({ tokenID: 'EGLD' }),
            ],
        );

        expect(transactions).toEqual([
            {
                tokenID: 'WEGLD-123456',
                amount: undefined,
                nonce: undefined,
            },
            { tokenID: 'MEX-123456' },
        ]);

        try {
            await service.validateTokens(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                [
                    new InputTokenModel({ tokenID: 'MEX-123456', nonce: 1 }),
                    new InputTokenModel({ tokenID: 'EGLD' }),
                ],
            );
        } catch (error) {
            expect(error).toEqual(new Error('Only ESDT tokens allowed!'));
        }

        try {
            await service.validateTokens(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
                [
                    new InputTokenModel({ tokenID: 'WEGLD-123456' }),
                    new InputTokenModel({ tokenID: 'EGLD' }),
                ],
            );
        } catch (error) {
            expect(error).toEqual(new Error('invalid tokens received'));
        }
    });

    it('should get add to whitelist transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.whitelist({
            pairAddress: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            address: Address.Zero().bech32(),
        });

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.whitelist,
            data: encodeTransactionData(
                'whitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get remove from whitelist transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.removeWhitelist({
            pairAddress: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            address: Address.Zero().bech32(),
        });

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.removeWhitelist,
            data: encodeTransactionData(
                'removeWhitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get add trusted swap pair transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.addTrustedSwapPair(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            Address.Zero().bech32(),
            'WEGLD-123456',
            'MEX-123456',
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.addTrustedSwapPair,
            data: encodeTransactionData(
                'addTrustedSwapPair@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@WEGLD-123456@MEX-123456',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get remove trusted swap pair transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.removeTrustedSwapPair(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            'WEGLD-123456',
            'MEX-123456',
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.removeTrustedSwapPair,
            data: encodeTransactionData(
                'removeTrustedSwapPair@WEGLD-123456@MEX-123456',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set transfer execution gas limit transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setTransferExecGasLimit(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            '50000000',
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.set_transfer_exec_gas_limit,
            data: encodeTransactionData('set_transfer_exec_gas_limit@50000000'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set extern swap gas limit transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setExternSwapGasLimit(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            '50000000',
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.set_extern_swap_gas_limit,
            data: encodeTransactionData('set_extern_swap_gas_limit@50000000'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get pause transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.pause(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.pause,
            data: encodeTransactionData('pause'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get resume transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.resume(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.resume,
            data: encodeTransactionData('resume'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set state active no swaps transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setStateActiveNoSwaps(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setStateActiveNoSwaps,
            data: encodeTransactionData('setStateActiveNoSwaps'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set fee percents transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setFeePercents(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            3,
            5,
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setFeePercents,
            data: encodeTransactionData('setFeePercents@03@05'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set max observations per period transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setMaxObservationsPerRecord(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            1000,
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setMaxObservationsPerRecord,
            data: encodeTransactionData('setMaxObservationsPerRecord@1000'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set BP swap config transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setBPSwapConfig(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setBPSwapConfig,
            data: encodeTransactionData(
                'setBPSwapConfig@1000@01000000000000000000@0100',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set BP remove config transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setBPRemoveConfig(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setBPRemoveConfig,
            data: encodeTransactionData(
                'setBPRemoveConfig@1000@01000000000000000000@0100',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set BP add config transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setBPAddConfig(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            {
                protectStopBlock: '1000',
                volumePercent: '1000000000000000000',
                maxNumActionsPerAddress: '100',
            },
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setBPAddConfig,
            data: encodeTransactionData(
                'setBPAddConfig@1000@01000000000000000000@0100',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set locking deadline epoch transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setLockingDeadlineEpoch(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            1000,
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setLockingDeadlineEpoch,
            data: encodeTransactionData('setLockingDeadlineEpoch@1000'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set unlocking epoch transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setUnlockEpoch(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            1005,
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.pairs.admin.setUnlockEpoch,
            data: encodeTransactionData('setUnlockEpoch@1005'),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set locking SC address transaction', async () => {
        const service = module.get<PairTransactionService>(
            PairTransactionService,
        );

        const transaction = await service.setLockingScAddress(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            Address.Zero().bech32(),
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: 200000000,
            data: encodeTransactionData(
                'setLockingScAddress@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });
});

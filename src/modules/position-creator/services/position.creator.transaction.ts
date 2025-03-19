import {
    Address,
    AddressValue,
    BigUIntValue,
    Token,
    TokenTransfer,
    TypedValue,
    U64Value,
    VariadicValue,
} from '@multiversx/sdk-core';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import {
    SWAP_TYPE,
    SwapRouteModel,
} from 'src/modules/auto-router/models/auto-route.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { ProxyFarmAbiService } from 'src/modules/proxy/services/proxy-farm/proxy.farm.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class PositionCreatorTransactionService {
    constructor(
        private readonly autoRouterTransaction: AutoRouterTransactionService,
        private readonly pairAbi: PairAbiService,
        private readonly pairService: PairService,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly tokenService: TokenService,
        private readonly wrapAbi: WrapAbiService,
        private readonly wrapTransaction: WrapTransactionsService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
        private readonly energyAbi: EnergyAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    async createLiquidityPositionSingleToken(
        sender: string,
        pairAddress: string,
        payment: EsdtTokenPayment,
        swapRoutes: SwapRouteModel[],
        lockEpochs?: number,
    ): Promise<TransactionModel[]> {
        const uniqueTokensIDs = await this.tokenService.getUniqueTokenIDs(
            false,
        );

        if (
            !uniqueTokensIDs.includes(payment.tokenIdentifier) &&
            payment.tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        const swapRouteArgs =
            swapRoutes.length < 2
                ? []
                : this.serializeSwapRouteArgs(swapRoutes[0]);
        const swapsCount =
            swapRoutes.length > 1
                ? swapRoutes[0].pairs.length + 1
                : swapRoutes.length;

        const [amount0Min, amount1Min] =
            await this.getMinimumAmountsForLiquidity(
                swapRoutes[swapRoutes.length - 1],
            );

        const gasLimit =
            gasConfig.positionCreator.singleToken.liquidityPosition +
            gasConfig.pairs.addLiquidity +
            gasConfig.pairs.swapTokensFixedInput.withFeeSwap * swapsCount;

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasLimit,
        });

        if (payment.tokenIdentifier === mxConfig.EGLDIdentifier) {
            transactionOptions.nativeTransferAmount = payment.amount;
        } else {
            transactionOptions.tokenTransfers = [
                new TokenTransfer({
                    token: new Token({
                        identifier: payment.tokenIdentifier,
                    }),
                    amount: BigInt(payment.amount),
                }),
            ];
        }

        if (lockEpochs) {
            return [
                await this.getLockedSingleTokenPairPositionTransaction(
                    lockEpochs,
                    amount0Min,
                    amount1Min,
                    swapRouteArgs,
                    transactionOptions,
                ),
            ];
        }

        return [
            await this.getSingleTokenPairPositionTransaction(
                pairAddress,
                amount0Min,
                amount1Min,
                swapRouteArgs,
                transactionOptions,
            ),
        ];
    }

    private async getLockedSingleTokenPairPositionTransaction(
        lockEpochs: number,
        amount0Min: BigNumber,
        amount1Min: BigNumber,
        swapRouteArgs: TypedValue[],
        transactionOptions: TransactionOptions,
    ): Promise<TransactionModel> {
        transactionOptions.function = 'createPairPosFromSingleToken';
        transactionOptions.arguments = [
            new U64Value(new BigNumber(lockEpochs)),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
            VariadicValue.fromItems(...swapRouteArgs),
        ];

        return this.mxProxy.getLockedTokenPositionCreatorContractTransaction(
            transactionOptions,
        );
    }

    private async getSingleTokenPairPositionTransaction(
        pairAddress: string,
        amount0Min: BigNumber,
        amount1Min: BigNumber,
        swapRouteArgs: TypedValue[],
        transactionOptions: TransactionOptions,
    ): Promise<TransactionModel> {
        transactionOptions.function = 'createLpPosFromSingleToken';
        transactionOptions.arguments = [
            new AddressValue(Address.newFromBech32(pairAddress)),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
            VariadicValue.fromItems(...swapRouteArgs),
        ];

        return this.mxProxy.getPositionCreatorContractTransaction(
            transactionOptions,
        );
    }

    async createFarmPositionSingleToken(
        sender: string,
        farmAddress: string,
        payments: EsdtTokenPayment[],
        swapRoutes: SwapRouteModel[],
        lockEpochs?: number,
    ): Promise<TransactionModel[]> {
        const [farmTokenID, uniqueTokensIDs, wrappedEgldTokenID] =
            await Promise.all([
                this.farmAbiV2.farmTokenID(farmAddress),
                this.tokenService.getUniqueTokenIDs(false),
                this.wrapAbi.wrappedEgldTokenID(),
            ]);

        if (
            !uniqueTokensIDs.includes(payments[0].tokenIdentifier) &&
            payments[0].tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        for (const payment of payments.slice(1)) {
            if (payment.tokenIdentifier !== farmTokenID) {
                throw new Error('Invalid farm token payment');
            }
        }

        const transactions = [];
        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length > 1
        ) {
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        }

        const swapRouteArgs =
            swapRoutes.length < 2
                ? []
                : this.serializeSwapRouteArgs(swapRoutes[0]);
        const swapsCount =
            swapRoutes.length > 1
                ? swapRoutes[0].pairs.length + 1
                : swapRoutes.length;

        const [amount0Min, amount1Min] =
            await this.getMinimumAmountsForLiquidity(
                swapRoutes[swapRoutes.length - 1],
            );

        const gasLimit =
            gasConfig.positionCreator.singleToken.farmPosition +
            gasConfig.pairs.addLiquidity +
            gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
            gasConfig.pairs.swapTokensFixedInput.withFeeSwap * swapsCount;

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasLimit,
            function: 'createFarmPosFromSingleToken',
        });

        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length === 1
        ) {
            transactionOptions.nativeTransferAmount = payments[0].amount;
        } else {
            payments[0].tokenIdentifier =
                payments[0].tokenIdentifier === mxConfig.EGLDIdentifier
                    ? wrappedEgldTokenID
                    : payments[0].tokenIdentifier;
            transactionOptions.tokenTransfers = payments.map(
                (payment) =>
                    new TokenTransfer({
                        token: new Token({
                            identifier: payment.tokenIdentifier,
                            nonce: BigInt(payment.tokenNonce),
                        }),
                        amount: BigInt(payment.amount),
                    }),
            );
        }

        if (lockEpochs) {
            transactions.push(
                await this.getLockedSingleTokenFarmPositionTransaction(
                    lockEpochs,
                    amount0Min,
                    amount1Min,
                    swapRouteArgs,
                    transactionOptions,
                ),
            );
            return transactions;
        }

        transactions.push(
            await this.getSingleTokenFarmPositionTransaction(
                farmAddress,
                amount0Min,
                amount1Min,
                swapRouteArgs,
                transactionOptions,
            ),
        );
        return transactions;
    }

    private async getSingleTokenFarmPositionTransaction(
        farmAddress: string,
        amount0Min: BigNumber,
        amount1Min: BigNumber,
        swapRouteArgs: TypedValue[],
        transactionOptions: TransactionOptions,
    ): Promise<TransactionModel> {
        transactionOptions.arguments = [
            new AddressValue(Address.newFromBech32(farmAddress)),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
            VariadicValue.fromItems(...swapRouteArgs),
        ];

        return this.mxProxy.getPositionCreatorContractTransaction(
            transactionOptions,
        );
    }

    private async getLockedSingleTokenFarmPositionTransaction(
        lockEpochs: number,
        amount0Min: BigNumber,
        amount1Min: BigNumber,
        swapRouteArgs: TypedValue[],
        transactionOptions: TransactionOptions,
    ): Promise<TransactionModel> {
        transactionOptions.arguments = [
            new U64Value(new BigNumber(lockEpochs)),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
            VariadicValue.fromItems(...swapRouteArgs),
        ];

        return this.mxProxy.getLockedTokenPositionCreatorContractTransaction(
            transactionOptions,
        );
    }

    async createDualFarmPositionSingleToken(
        sender: string,
        stakingProxyAddress: string,
        payments: EsdtTokenPayment[],
        swapRoutes: SwapRouteModel[],
    ): Promise<TransactionModel[]> {
        const [
            pairAddress,
            dualYieldTokenID,
            uniqueTokensIDs,
            wrappedEgldTokenID,
        ] = await Promise.all([
            this.stakingProxyAbi.pairAddress(stakingProxyAddress),
            this.stakingProxyAbi.dualYieldTokenID(stakingProxyAddress),
            this.tokenService.getUniqueTokenIDs(false),
            this.wrapAbi.wrappedEgldTokenID(),
        ]);

        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);

        if (
            !uniqueTokensIDs.includes(payments[0].tokenIdentifier) &&
            payments[0].tokenIdentifier !== lpTokenID &&
            payments[0].tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        for (const payment of payments.slice(1)) {
            if (payment.tokenIdentifier !== dualYieldTokenID) {
                throw new Error('Invalid dual yield token payment');
            }
        }

        const transactions = [];
        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length > 1
        ) {
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        }

        const swapRouteArgs =
            swapRoutes.length < 2
                ? []
                : this.serializeSwapRouteArgs(swapRoutes[0]);
        const swapsCount =
            swapRoutes.length > 1
                ? swapRoutes[0].pairs.length + 1
                : swapRoutes.length;

        const [amount0Min, amount1Min] =
            payments[0].tokenIdentifier === lpTokenID
                ? [new BigNumber(0), new BigNumber(0)]
                : await this.getMinimumAmountsForLiquidity(
                      swapRoutes[swapRoutes.length - 1],
                  );

        const gasLimit =
            gasConfig.positionCreator.singleToken.dualFarmPosition +
            gasConfig.pairs.addLiquidity +
            gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
            gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge +
            gasConfig.pairs.swapTokensFixedInput.withFeeSwap * swapsCount;

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasLimit,
            function: 'createMetastakingPosFromSingleToken',
            arguments: [
                new AddressValue(Address.newFromBech32(stakingProxyAddress)),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
                VariadicValue.fromItems(...swapRouteArgs),
            ],
        });

        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length === 1
        ) {
            transactionOptions.nativeTransferAmount = payments[0].amount;
        } else {
            payments[0].tokenIdentifier =
                payments[0].tokenIdentifier === mxConfig.EGLDIdentifier
                    ? wrappedEgldTokenID
                    : payments[0].tokenIdentifier;
            transactionOptions.tokenTransfers = payments.map(
                (payment) =>
                    new TokenTransfer({
                        token: new Token({
                            identifier: payment.tokenIdentifier,
                            nonce: BigInt(payment.tokenNonce),
                        }),
                        amount: BigInt(payment.amount),
                    }),
            );
        }

        const transaction =
            await this.mxProxy.getPositionCreatorContractTransaction(
                transactionOptions,
            );

        transactions.push(transaction);
        return transactions;
    }

    async createStakingPositionSingleToken(
        sender: string,
        stakingAddress: string,
        swapRoute: SwapRouteModel,
        payments: EsdtTokenPayment[],
    ): Promise<TransactionModel[]> {
        const [farmTokenID, uniqueTokensIDs, wrappedEgldTokenID] =
            await Promise.all([
                this.stakingAbi.farmTokenID(stakingAddress),
                this.tokenService.getUniqueTokenIDs(false),
                this.wrapAbi.wrappedEgldTokenID(),
            ]);

        if (
            !uniqueTokensIDs.includes(payments[0].tokenIdentifier) &&
            payments[0].tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        for (const payment of payments.slice(1)) {
            if (payment.tokenIdentifier !== farmTokenID) {
                throw new Error('Invalid staking token payment');
            }
        }

        const transactions = [];
        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length > 1
        ) {
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        }

        const multiSwapArgs = this.serializeSwapRouteArgs(swapRoute);

        const gasLimit =
            gasConfig.positionCreator.singleToken.stakingPosition +
            gasConfig.stake.stakeFarm.withTokenMerge +
            gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                swapRoute.pairs.length;

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasLimit,
            function: 'createFarmStakingPosFromSingleToken',
            arguments: [
                new AddressValue(Address.newFromBech32(stakingAddress)),
                new BigUIntValue(
                    new BigNumber(
                        swapRoute.intermediaryAmounts[
                            swapRoute.intermediaryAmounts.length - 1
                        ],
                    ),
                ),
                VariadicValue.fromItems(...multiSwapArgs),
            ],
        });

        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length === 1
        ) {
            transactionOptions.nativeTransferAmount = payments[0].amount;
        } else {
            payments[0].tokenIdentifier =
                payments[0].tokenIdentifier === mxConfig.EGLDIdentifier
                    ? wrappedEgldTokenID
                    : payments[0].tokenIdentifier;
            transactionOptions.tokenTransfers = payments.map(
                (payment) =>
                    new TokenTransfer({
                        token: new Token({
                            identifier: payment.tokenIdentifier,
                            nonce: BigInt(payment.tokenNonce),
                        }),
                        amount: BigInt(payment.amount),
                    }),
            );
        }

        const transaction =
            await this.mxProxy.getPositionCreatorContractTransaction(
                transactionOptions,
            );

        transactions.push(transaction);
        return transactions;
    }

    async createFarmPositionDualTokens(
        sender: string,
        farmAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const pairAddress = await this.farmAbiV2.pairContractAddress(
            farmAddress,
        );
        const [
            firstTokenID,
            secondTokenID,
            farmTokenID,
            wrappedFarmTokenID,
            xmexTokenID,
        ] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
            this.farmAbiV2.farmTokenID(farmAddress),
            this.proxyFarmAbi.wrappedFarmTokenID(scAddress.proxyDexAddress.v2),
            this.energyAbi.lockedTokenID(),
        ]);

        const transactions = [];

        if (payments[0].tokenIdentifier === mxConfig.EGLDIdentifier) {
            payments[0].tokenIdentifier =
                await this.wrapAbi.wrappedEgldTokenID();
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        }

        if (payments[1].tokenIdentifier === mxConfig.EGLDIdentifier) {
            payments[1].tokenIdentifier =
                await this.wrapAbi.wrappedEgldTokenID();
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[1].amount),
            );
        }

        const [firstPayment, secondPayment] =
            payments[0].tokenIdentifier === firstTokenID
                ? [payments[0], payments[1]]
                : [payments[1], payments[0]];

        const isLockedToken =
            firstPayment.tokenIdentifier === xmexTokenID ||
            secondPayment.tokenIdentifier === xmexTokenID;

        if (
            isLockedToken &&
            !this.checkLockedTokenPayments(
                [firstPayment, secondPayment],
                firstTokenID,
                xmexTokenID,
            )
        ) {
            throw new Error('Invalid locked tokens payments');
        }

        if (
            !isLockedToken &&
            !this.checkTokensPayments(
                [firstPayment, secondPayment],
                firstTokenID,
                secondTokenID,
            )
        ) {
            throw new Error('Invalid ESDT tokens payments');
        }

        if (!isLockedToken) {
            for (const payment of payments.slice(2)) {
                if (payment.tokenIdentifier !== farmTokenID) {
                    throw new Error('Invalid farm token payment');
                }
            }
        } else {
            for (const payment of payments.slice(2)) {
                if (payment.tokenIdentifier !== wrappedFarmTokenID) {
                    throw new Error('Invalid wrapped farm token payment');
                }
            }
        }

        const amount0Min = new BigNumber(firstPayment.amount)
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(secondPayment.amount)
            .multipliedBy(1 - tolerance)
            .integerValue();

        const endpointArgs = isLockedToken
            ? [new BigUIntValue(amount0Min), new BigUIntValue(amount1Min)]
            : [
                  new AddressValue(Address.fromBech32(farmAddress)),
                  new BigUIntValue(amount0Min),
                  new BigUIntValue(amount1Min),
              ];

        const gasLimit = isLockedToken
            ? gasConfig.positionCreator.dualTokens.farmPositionProxy
            : gasConfig.positionCreator.dualTokens.farmPosition;

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasLimit,
            function: 'createFarmPosFromTwoTokens',
            arguments: endpointArgs,
            tokenTransfers: [
                new TokenTransfer({
                    token: new Token({
                        identifier: firstPayment.tokenIdentifier,
                    }),
                    amount: BigInt(firstPayment.amount),
                }),
                new TokenTransfer({
                    token: new Token({
                        identifier: secondPayment.tokenIdentifier,
                        nonce: BigInt(secondPayment.tokenNonce),
                    }),
                    amount: BigInt(secondPayment.amount),
                }),
                ...payments.slice(2).map(
                    (payment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: payment.tokenIdentifier,
                                nonce: BigInt(payment.tokenNonce),
                            }),
                            amount: BigInt(payment.amount),
                        }),
                ),
            ],
        });

        const transaction = isLockedToken
            ? await this.mxProxy.getLockedTokenPositionCreatorContractTransaction(
                  transactionOptions,
              )
            : await this.mxProxy.getPositionCreatorContractTransaction(
                  transactionOptions,
              );

        transactions.push(transaction);

        return transactions;
    }

    async createDualFarmPositionDualTokens(
        sender: string,
        stakingProxyAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const pairAddress = await this.stakingProxyAbi.pairAddress(
            stakingProxyAddress,
        );

        const transactions = [];

        if (payments[0].tokenIdentifier === mxConfig.EGLDIdentifier) {
            payments[0].tokenIdentifier =
                await this.wrapAbi.wrappedEgldTokenID();
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        }

        if (payments[1].tokenIdentifier === mxConfig.EGLDIdentifier) {
            payments[1].tokenIdentifier =
                await this.wrapAbi.wrappedEgldTokenID();
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[1].amount),
            );
        }

        const [firstTokenID, secondTokenID, dualYieldTokenID] =
            await Promise.all([
                this.pairAbi.firstTokenID(pairAddress),
                this.pairAbi.secondTokenID(pairAddress),
                this.stakingProxyAbi.dualYieldTokenID(stakingProxyAddress),
            ]);

        if (!this.checkTokensPayments(payments, firstTokenID, secondTokenID)) {
            throw new Error('Invalid ESDT tokens payments');
        }

        for (const payment of payments.slice(2)) {
            if (payment.tokenIdentifier !== dualYieldTokenID) {
                throw new Error('Invalid dual farm token payment');
            }
        }

        const [firstPayment, secondPayment] =
            payments[0].tokenIdentifier === firstTokenID
                ? [payments[0], payments[1]]
                : [payments[1], payments[0]];

        const amount0Min = new BigNumber(firstPayment.amount)
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(secondPayment.amount)
            .multipliedBy(1 - tolerance)
            .integerValue();

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasConfig.positionCreator.dualTokens.dualFarmPosition,
            function: 'createMetastakingPosFromTwoTokens',
            arguments: [
                new AddressValue(Address.newFromBech32(stakingProxyAddress)),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
            ],
            tokenTransfers: [
                new TokenTransfer({
                    token: new Token({
                        identifier: firstPayment.tokenIdentifier,
                    }),
                    amount: BigInt(firstPayment.amount),
                }),
                new TokenTransfer({
                    token: new Token({
                        identifier: secondPayment.tokenIdentifier,
                    }),
                    amount: BigInt(secondPayment.amount),
                }),
                ...payments.slice(2).map(
                    (payment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: payment.tokenIdentifier,
                                nonce: BigInt(payment.tokenNonce),
                            }),
                            amount: BigInt(payment.amount),
                        }),
                ),
            ],
        });

        const transaction =
            await this.mxProxy.getPositionCreatorContractTransaction(
                transactionOptions,
            );

        transactions.push(transaction);
        return transactions;
    }

    async exitFarmPositionDualTokens(
        sender: string,
        farmAddress: string,
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<TransactionModel> {
        const [pairAddress, farmTokenID] = await Promise.all([
            this.farmAbiV2.pairContractAddress(farmAddress),
            this.farmAbiV2.farmTokenID(farmAddress),
        ]);

        if (payment.tokenIdentifier !== farmTokenID) {
            throw new Error('Invalid farm token payment');
        }

        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            payment.amount,
        );
        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - tolerance)
            .integerValue();

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasConfig.positionCreator.dualTokens.exitFarm,
            function: 'exitFarmPos',
            arguments: [
                new AddressValue(Address.newFromBech32(farmAddress)),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
            ],
            tokenTransfers: [
                new TokenTransfer({
                    token: new Token({
                        identifier: payment.tokenIdentifier,
                        nonce: BigInt(payment.tokenNonce),
                    }),
                    amount: BigInt(payment.amount),
                }),
            ],
        });

        return this.mxProxy.getPositionCreatorContractTransaction(
            transactionOptions,
        );
    }

    async createEnergyPosition(
        sender: string,
        payment: EsdtTokenPayment,
        swapRoute: SwapRouteModel,
        lockEpochs: number,
    ): Promise<TransactionModel[]> {
        const uniqueTokensIDs = await this.tokenService.getUniqueTokenIDs(
            false,
        );

        if (
            !uniqueTokensIDs.includes(payment.tokenIdentifier) &&
            payment.tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        const amountOutMin = new BigNumber(swapRoute.amountOut)
            .multipliedBy(1 - swapRoute.tolerance)
            .integerValue();

        const swapRouteArgs = this.serializeSwapRouteArgs(swapRoute);
        const gasLimit =
            gasConfig.positionCreator.energyPosition +
            gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                swapRoute.pairs.length;

        const transactionOptions = new TransactionOptions({
            sender: sender,
            chainID: mxConfig.chainID,
            gasLimit: gasLimit,
            function: 'createEnergyPosition',
            arguments: [
                new U64Value(new BigNumber(lockEpochs)),
                new BigUIntValue(amountOutMin),
                VariadicValue.fromItems(...swapRouteArgs),
            ],
        });

        if (payment.tokenIdentifier === mxConfig.EGLDIdentifier) {
            transactionOptions.nativeTransferAmount = payment.amount;
        } else {
            transactionOptions.tokenTransfers = [
                new TokenTransfer({
                    token: new Token({
                        identifier: payment.tokenIdentifier,
                    }),
                    amount: BigInt(payment.amount),
                }),
            ];
        }

        const transaction =
            await this.mxProxy.getLockedTokenPositionCreatorContractTransaction(
                transactionOptions,
            );

        return [transaction];
    }

    private async getMinimumAmountsForLiquidity(
        swapRoute: SwapRouteModel,
    ): Promise<BigNumber[]> {
        const pair = swapRoute.pairs[0];
        let amount0: BigNumber;
        let amount1: BigNumber;

        if (swapRoute.tokenInID === pair.firstToken.identifier) {
            amount0 = await this.pairService.getEquivalentForLiquidity(
                pair.address,
                pair.secondToken.identifier,
                swapRoute.amountOut,
            );
            amount1 = new BigNumber(swapRoute.amountOut);
        } else {
            amount0 = new BigNumber(swapRoute.amountOut);
            amount1 = await this.pairService.getEquivalentForLiquidity(
                pair.address,
                pair.firstToken.identifier,
                swapRoute.amountOut,
            );
        }

        const amount0Min = amount0
            .multipliedBy(1 - swapRoute.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - swapRoute.tolerance)
            .integerValue();

        return [amount0Min, amount1Min];
    }

    private checkTokensPayments(
        payments: EsdtTokenPayment[],
        firstTokenID: string,
        secondTokenID: string,
    ): boolean {
        return (
            (payments[0].tokenIdentifier === firstTokenID &&
                payments[1].tokenIdentifier === secondTokenID) ||
            (payments[1].tokenIdentifier === firstTokenID &&
                payments[0].tokenIdentifier === secondTokenID)
        );
    }

    private checkLockedTokenPayments(
        payments: EsdtTokenPayment[],
        firstTokenID: string,
        lockedTokenID: string,
    ): boolean {
        if (payments[0].tokenNonce > 0 || payments[1].tokenNonce < 1) {
            return false;
        }

        if (
            payments[0].tokenIdentifier !== firstTokenID ||
            payments[1].tokenIdentifier !== lockedTokenID
        ) {
            return false;
        }

        return true;
    }

    private serializeSwapRouteArgs(swapRoute: SwapRouteModel): TypedValue[] {
        return this.autoRouterTransaction.multiPairFixedInputSwaps({
            tokenInID: swapRoute.tokenInID,
            tokenOutID: swapRoute.tokenOutID,
            swapType: SWAP_TYPE.fixedInput,
            tolerance: swapRoute.tolerance,
            addressRoute: swapRoute.pairs.map((pair) => pair.address),
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            tokenRoute: swapRoute.tokenRoute,
        });
    }
}

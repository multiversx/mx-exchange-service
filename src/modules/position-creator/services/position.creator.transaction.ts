import {
    Address,
    AddressValue,
    BigUIntValue,
    Interaction,
    TokenTransfer,
    U64Value,
} from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { PositionCreatorComputeService } from './position.creator.compute';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { ProxyFarmAbiService } from 'src/modules/proxy/services/proxy-farm/proxy.farm.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';

@Injectable()
export class PositionCreatorTransactionService {
    constructor(
        private readonly autoRouterService: AutoRouterService,
        private readonly autoRouterTransaction: AutoRouterTransactionService,
        private readonly posCreatorCompute: PositionCreatorComputeService,
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
        tolerance: number,
        lockEpochs?: number,
    ): Promise<TransactionModel> {
        const uniqueTokensIDs = await this.tokenService.getUniqueTokenIDs(
            false,
        );

        if (
            !uniqueTokensIDs.includes(payment.tokenIdentifier) &&
            payment.tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        const singleTokenPairInput =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                payment,
                tolerance,
            );

        const contract = lockEpochs
            ? await this.mxProxy.getLockedTokenPositionCreatorContract()
            : await this.mxProxy.getPostitionCreatorContract();

        let interaction: Interaction;

        if (lockEpochs) {
            interaction = contract.methodsExplicit
                .createPairPosFromSingleToken([
                    new U64Value(new BigNumber(lockEpochs)),
                    new BigUIntValue(singleTokenPairInput.amount0Min),
                    new BigUIntValue(singleTokenPairInput.amount1Min),
                    ...singleTokenPairInput.swapRouteArgs,
                ])
                .withGasLimit(gasConfig.positionCreator.singleToken);
        } else {
            interaction = contract.methodsExplicit
                .createLpPosFromSingleToken([
                    new AddressValue(Address.fromBech32(pairAddress)),
                    new BigUIntValue(singleTokenPairInput.amount0Min),
                    new BigUIntValue(singleTokenPairInput.amount1Min),
                    ...singleTokenPairInput.swapRouteArgs,
                ])
                .withGasLimit(gasConfig.positionCreator.singleToken);
        }

        interaction = interaction
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID);

        if (payment.tokenIdentifier === mxConfig.EGLDIdentifier) {
            interaction = interaction.withValue(new BigNumber(payment.amount));
        } else {
            interaction = interaction.withSingleESDTTransfer(
                TokenTransfer.fungibleFromBigInteger(
                    payment.tokenIdentifier,
                    new BigNumber(payment.amount),
                ),
            );
        }

        return interaction.buildTransaction().toPlainObject();
    }

    async createFarmPositionSingleToken(
        sender: string,
        farmAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
        lockEpochs?: number,
    ): Promise<TransactionModel[]> {
        const [pairAddress, farmTokenID, uniqueTokensIDs] = await Promise.all([
            this.farmAbiV2.pairContractAddress(farmAddress),
            this.farmAbiV2.farmTokenID(farmAddress),
            this.tokenService.getUniqueTokenIDs(false),
        ]);

        const transactions = [];
        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length > 1
        ) {
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        } else if (
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

        const singleTokenPairInput =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                payments[0],
                tolerance,
            );

        const contract = lockEpochs
            ? await this.mxProxy.getLockedTokenPositionCreatorContract()
            : await this.mxProxy.getPostitionCreatorContract();

        const endpointArgs = lockEpochs
            ? [
                  new U64Value(new BigNumber(lockEpochs)),
                  new BigUIntValue(singleTokenPairInput.amount0Min),
                  new BigUIntValue(singleTokenPairInput.amount1Min),
                  ...singleTokenPairInput.swapRouteArgs,
              ]
            : [
                  new AddressValue(Address.fromBech32(farmAddress)),
                  new BigUIntValue(singleTokenPairInput.amount0Min),
                  new BigUIntValue(singleTokenPairInput.amount1Min),
                  ...singleTokenPairInput.swapRouteArgs,
              ];

        const transaction = contract.methodsExplicit
            .createFarmPosFromSingleToken(endpointArgs)
            .withMultiESDTNFTTransfer(
                payments.map((payment) =>
                    TokenTransfer.metaEsdtFromBigInteger(
                        payment.tokenIdentifier,
                        payment.tokenNonce,
                        new BigNumber(payment.amount),
                    ),
                ),
            )
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();

        transactions.push(transaction);
        return transactions;
    }

    async createDualFarmPositionSingleToken(
        sender: string,
        stakingProxyAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const [pairAddress, dualYieldTokenID, uniqueTokensIDs] =
            await Promise.all([
                this.stakingProxyAbi.pairAddress(stakingProxyAddress),
                this.stakingProxyAbi.dualYieldTokenID(stakingProxyAddress),
                this.tokenService.getUniqueTokenIDs(false),
            ]);

        const transactions = [];
        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length > 1
        ) {
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        } else if (
            !uniqueTokensIDs.includes(payments[0].tokenIdentifier) &&
            payments[0].tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        for (const payment of payments.slice(1)) {
            if (payment.tokenIdentifier !== dualYieldTokenID) {
                throw new Error('Invalid dual yield token payment');
            }
        }

        const singleTokenPairInput =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                payments[0],
                tolerance,
            );

        const contract = await this.mxProxy.getPostitionCreatorContract();

        const transaction = contract.methodsExplicit
            .createMetastakingPosFromSingleToken([
                new AddressValue(Address.fromBech32(stakingProxyAddress)),
                new BigUIntValue(singleTokenPairInput.amount0Min),
                new BigUIntValue(singleTokenPairInput.amount1Min),
                ...singleTokenPairInput.swapRouteArgs,
            ])
            .withMultiESDTNFTTransfer(
                payments.map((payment) =>
                    TokenTransfer.metaEsdtFromBigInteger(
                        payment.tokenIdentifier,
                        payment.tokenNonce,
                        new BigNumber(payment.amount),
                    ),
                ),
            )
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();

        transactions.push(transaction);
        return transactions;
    }

    async createStakingPositionSingleToken(
        sender: string,
        stakingAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel[]> {
        const [farmingTokenID, farmTokenID, uniqueTokensIDs] =
            await Promise.all([
                this.stakingAbi.farmingTokenID(stakingAddress),
                this.stakingAbi.farmTokenID(stakingAddress),
                this.tokenService.getUniqueTokenIDs(false),
            ]);

        const transactions = [];

        if (
            payments[0].tokenIdentifier === mxConfig.EGLDIdentifier &&
            payments.length > 1
        ) {
            transactions.push(
                await this.wrapTransaction.wrapEgld(sender, payments[0].amount),
            );
        } else if (
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

        const swapRoute = await this.autoRouterService.swap({
            tokenInID: payments[0].tokenIdentifier,
            amountIn: payments[0].amount,
            tokenOutID: farmingTokenID,
            tolerance,
        });

        const contract = await this.mxProxy.getPostitionCreatorContract();

        const multiSwapArgs =
            this.autoRouterTransaction.multiPairFixedInputSwaps({
                tokenInID: swapRoute.tokenInID,
                tokenOutID: swapRoute.tokenOutID,
                swapType: SWAP_TYPE.fixedInput,
                tolerance,
                addressRoute: swapRoute.pairs.map((pair) => pair.address),
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                tokenRoute: swapRoute.tokenRoute,
            });

        const transaction = contract.methodsExplicit
            .createFarmStakingPosFromSingleToken([
                new AddressValue(Address.fromBech32(stakingAddress)),
                new BigUIntValue(
                    new BigNumber(
                        swapRoute.intermediaryAmounts[
                            swapRoute.intermediaryAmounts.length - 1
                        ],
                    ),
                ),
                ...multiSwapArgs,
            ])
            .withMultiESDTNFTTransfer(
                payments.map((payment) =>
                    TokenTransfer.metaEsdtFromBigInteger(
                        payment.tokenIdentifier,
                        payment.tokenNonce,
                        new BigNumber(payment.amount),
                    ),
                ),
            )
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();

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
            throw new Error('Invalid Locked tokens payments');
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

        const contract = isLockedToken
            ? await this.mxProxy.getLockedTokenPositionCreatorContract()
            : await this.mxProxy.getPostitionCreatorContract();

        const transaction = contract.methodsExplicit
            .createFarmPosFromTwoTokens(endpointArgs)
            .withMultiESDTNFTTransfer([
                TokenTransfer.fungibleFromBigInteger(
                    firstPayment.tokenIdentifier,
                    new BigNumber(firstPayment.amount),
                ),
                TokenTransfer.metaEsdtFromBigInteger(
                    secondPayment.tokenIdentifier,
                    secondPayment.tokenNonce,
                    new BigNumber(secondPayment.amount),
                ),
                ...payments
                    .slice(2)
                    .map((payment) =>
                        TokenTransfer.metaEsdtFromBigInteger(
                            payment.tokenIdentifier,
                            payment.tokenNonce,
                            new BigNumber(payment.amount),
                        ),
                    ),
            ])
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();

        transactions.push(transaction);

        return transactions;
    }

    async createDualFarmPositionDualTokens(
        sender: string,
        stakingProxyAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel> {
        const pairAddress = await this.stakingProxyAbi.pairAddress(
            stakingProxyAddress,
        );
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

        const contract = await this.mxProxy.getPostitionCreatorContract();

        return contract.methodsExplicit
            .createMetastakingPosFromTwoTokens([
                new AddressValue(Address.fromBech32(stakingProxyAddress)),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
            ])
            .withMultiESDTNFTTransfer([
                TokenTransfer.fungibleFromBigInteger(
                    firstPayment.tokenIdentifier,
                    new BigNumber(firstPayment.amount),
                ),
                TokenTransfer.fungibleFromBigInteger(
                    secondPayment.tokenIdentifier,

                    new BigNumber(secondPayment.amount),
                ),
                ...payments
                    .slice(2)
                    .map((payment) =>
                        TokenTransfer.metaEsdtFromBigInteger(
                            payment.tokenIdentifier,
                            payment.tokenNonce,
                            new BigNumber(payment.amount),
                        ),
                    ),
            ])
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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

        const contract = await this.mxProxy.getPostitionCreatorContract();

        return contract.methodsExplicit
            .exitFarmPos([
                new AddressValue(Address.fromBech32(farmAddress)),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
            ])
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenIdentifier,
                    payment.tokenNonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async createEnergyPosition(
        sender: string,
        payment: EsdtTokenPayment,
        lockEpochs: number,
        tolerance: number,
    ): Promise<TransactionModel> {
        const uniqueTokensIDs = await this.tokenService.getUniqueTokenIDs(
            false,
        );

        if (
            !uniqueTokensIDs.includes(payment.tokenIdentifier) &&
            payment.tokenIdentifier !== mxConfig.EGLDIdentifier
        ) {
            throw new Error('Invalid ESDT token payment');
        }

        const singleTokenInput =
            await this.posCreatorCompute.computeSingleTokenInput(
                payment,
                tolerance,
            );

        const contract =
            await this.mxProxy.getLockedTokenPositionCreatorContract();

        const interaction = contract.methodsExplicit
            .createEnergyPosition([
                new U64Value(new BigNumber(lockEpochs)),
                new BigUIntValue(singleTokenInput.amountOutMin),
                ...singleTokenInput.swapRouteArgs,
            ])
            .withSender(Address.fromBech32(sender))
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID);

        if (payment.tokenIdentifier === mxConfig.EGLDIdentifier) {
            interaction.withValue(new BigNumber(payment.amount));
        } else {
            interaction.withSingleESDTTransfer(
                TokenTransfer.fungibleFromBigInteger(
                    payment.tokenIdentifier,
                    new BigNumber(payment.amount),
                ),
            );
        }

        return interaction.buildTransaction().toPlainObject();
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
}

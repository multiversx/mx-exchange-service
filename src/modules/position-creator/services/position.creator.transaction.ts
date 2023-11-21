import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    TokenIdentifierValue,
    TokenTransfer,
} from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig } from 'src/config';
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
        private readonly mxProxy: MXProxyService,
    ) {}

    async createLiquidityPositionSingleToken(
        pairAddress: string,
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<TransactionModel> {
        const uniqueTokensIDs = await this.tokenService.getUniqueTokenIDs(
            false,
        );

        if (!uniqueTokensIDs.includes(payment.tokenIdentifier)) {
            throw new Error('Invalid token');
        }

        const singleTokenPairInput =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                payment,
                tolerance,
            );

        const contract = await this.mxProxy.getPostitionCreatorContract();

        return contract.methodsExplicit
            .createLpPosFromSingleToken([
                new AddressValue(Address.fromBech32(pairAddress)),
                new BigUIntValue(singleTokenPairInput.amount0Min),
                new BigUIntValue(singleTokenPairInput.amount1Min),
                ...singleTokenPairInput.swapRouteArgs,
            ])
            .withSingleESDTTransfer(
                TokenTransfer.fungibleFromBigInteger(
                    payment.tokenIdentifier,
                    new BigNumber(payment.amount),
                ),
            )
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async createFarmPositionSingleToken(
        farmAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel> {
        const [pairAddress, farmTokenID, uniqueTokensIDs] = await Promise.all([
            this.farmAbiV2.pairContractAddress(farmAddress),
            this.farmAbiV2.farmTokenID(farmAddress),
            this.tokenService.getUniqueTokenIDs(false),
        ]);

        if (!uniqueTokensIDs.includes(payments[0].tokenIdentifier)) {
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

        const contract = await this.mxProxy.getPostitionCreatorContract();

        return contract.methodsExplicit
            .createFarmPosFromSingleToken([
                new AddressValue(Address.fromBech32(farmAddress)),
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
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async createDualFarmPositionSingleToken(
        stakingProxyAddress: string,
        payments: EsdtTokenPayment[],
        tolerance: number,
    ): Promise<TransactionModel> {
        const [pairAddress, dualYieldTokenID, uniqueTokensIDs] =
            await Promise.all([
                this.stakingProxyAbi.pairAddress(stakingProxyAddress),
                this.stakingProxyAbi.dualYieldTokenID(stakingProxyAddress),
                this.tokenService.getUniqueTokenIDs(false),
            ]);

        if (!uniqueTokensIDs.includes(payments[0].tokenIdentifier)) {
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

        return contract.methodsExplicit
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
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }


        const swapRoute = await this.autoRouterService.swap({
            tokenInID: payment.tokenIdentifier,
            amountIn: payment.amount,
            tokenOutID: swapToTokenID,
            tolerance,
        });

        const halfPayment = new BigNumber(swapRoute.amountOut)
            .dividedBy(2)
            .integerValue()
            .toFixed();

        const remainingPayment = new BigNumber(swapRoute.amountOut)
            .minus(halfPayment)
            .toFixed();

        const [amount0, amount1] = await Promise.all([
            await this.posCreatorCompute.computeSwap(
                swapRoute.tokenOutID,
                firstTokenID,
                halfPayment,
            ),
            await this.posCreatorCompute.computeSwap(
                swapRoute.tokenOutID,
                secondTokenID,
                remainingPayment,
            ),
        ]);

        const amount0Min = new BigNumber(amount0)
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(amount1)
            .multipliedBy(1 - tolerance)
            .integerValue();

        const contract = await this.mxProxy.getPostitionCreatorContract();

        return contract.methodsExplicit
            .createLpPosFromSingleToken([
                new AddressValue(Address.fromBech32(pairAddress)),
                new BigUIntValue(amount0Min),
                new BigUIntValue(amount1Min),
                new AddressValue(
                    Address.fromBech32(swapRoute.pairs[0].address),
                ),
                new BytesValue(Buffer.from('swapTokensFixedInput')),
                new TokenIdentifierValue(swapRoute.tokenOutID),
                new BigUIntValue(
                    new BigNumber(
                        swapRoute.intermediaryAmounts[
                            swapRoute.intermediaryAmounts.length - 1
                        ],
                    ),
                ),
            ])
            .withSingleESDTTransfer(
                TokenTransfer.fungibleFromBigInteger(
                    payment.tokenIdentifier,
                    new BigNumber(payment.amount),
                ),
            )
            .withGasLimit(gasConfig.positionCreator.singleToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}

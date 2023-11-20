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
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

@Injectable()
export class PositionCreatorTransactionService {
    constructor(
        private readonly autoRouterService: AutoRouterService,
        private readonly routerAbi: RouterAbiService,
        private readonly posCreatorCompute: PositionCreatorComputeService,
        private readonly pairAbi: PairAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    async createLiquidityPositionSingleToken(
        pairAddress: string,
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<TransactionModel> {
        const acceptedPairedTokensIDs =
            await this.routerAbi.commonTokensForUserPairs();

        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        const swapToTokenID = acceptedPairedTokensIDs.includes(firstTokenID)
            ? firstTokenID
            : secondTokenID;

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

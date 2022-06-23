import { Address, BigUIntValue, TokenPayment } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, gasConfig } from 'src/config';
import { ruleOfThree } from 'src/helpers/helpers';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { FarmService } from 'src/modules/farm/services/farm.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import {
    ClaimDualYieldArgs,
    ProxyStakeFarmArgs,
    UnstakeFarmTokensArgs,
} from '../models/staking.proxy.args.model';
import { StakingProxyGetterService } from './staking.proxy.getter.service';
import { StakingProxyService } from './staking.proxy.service';

@Injectable()
export class StakingProxyTransactionService {
    constructor(
        private readonly stakeProxyService: StakingProxyService,
        private readonly stakeProxyGetter: StakingProxyGetterService,
        private readonly pairService: PairService,
        private readonly farmService: FarmService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async stakeFarmTokens(
        sender: string,
        args: ProxyStakeFarmArgs,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(
                args.proxyStakingAddress,
                args.payments,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                StakingProxyTransactionService.name,
                this.stakeFarmTokens.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        const gasLimit =
            args.payments.length > 1
                ? gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge
                : gasConfig.stakeProxy.stakeFarmTokens.default;
        const mappedPayments = args.payments.map(payment =>
            TokenPayment.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );

        return contract.methodsExplicit
            .stakeFarmTokens()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimDualYield(
        sender: string,
        args: ClaimDualYieldArgs,
    ): Promise<TransactionModel> {
        const dualYieldTokenID = await this.stakeProxyGetter.getDualYieldTokenID(
            args.proxyStakingAddress,
        );
        for (const payment of args.payments) {
            if (payment.tokenID !== dualYieldTokenID) {
                throw new Error('invalid dual yield token for claim');
            }
        }

        const contract = await this.elrondProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );
        const mappedPayments = args.payments.map(payment =>
            TokenPayment.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );

        return contract.methodsExplicit
            .claimDualYield()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stakeProxy.claimDualYield)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unstakeFarmTokens(
        sender: string,
        args: UnstakeFarmTokensArgs,
    ): Promise<TransactionModel> {
        const decodedAttributes = this.stakeProxyService.decodeDualYieldTokenAttributes(
            {
                batchAttributes: [
                    {
                        identifier: args.payment.tokenID,
                        attributes: args.attributes,
                    },
                ],
            },
        );
        const [farmTokenID, farmAddress] = await Promise.all([
            this.stakeProxyGetter.getLpFarmTokenID(args.proxyStakingAddress),
            this.stakeProxyGetter.getLpFarmAddress(args.proxyStakingAddress),
        ]);
        const farmTokenPosition = tokenIdentifier(
            farmTokenID,
            decodedAttributes[0].lpFarmTokenNonce,
        );
        const [farmToken, pairAddress] = await Promise.all([
            this.apiService.getNftByTokenIdentifier(
                args.proxyStakingAddress,
                farmTokenPosition,
            ),
            this.stakeProxyGetter.getPairAddress(args.proxyStakingAddress),
        ]);

        const liquidityPositionAmount = ruleOfThree(
            new BigNumber(args.payment.amount),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        );

        const exitFarmPosition = await this.farmService.getTokensForExitFarm({
            attributes: farmToken.attributes,
            identifier: farmToken.identifier,
            farmAddress: farmAddress,
            liquidity: liquidityPositionAmount.toFixed(),
            vmQuery: false,
        });

        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            exitFarmPosition.farmingTokens,
        );
        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.elrondProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        const endpointArgs = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return contract.methodsExplicit
            .unstakeFarmTokens(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.payment.tokenID,
                    args.payment.nonce,
                    new BigNumber(args.payment.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stakeProxy.unstakeFarmTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputTokens(
        proxyStakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [lpFarmTokenID, dualYieldTokenID] = await Promise.all([
            this.stakeProxyGetter.getLpFarmTokenID(proxyStakeAddress),
            this.stakeProxyGetter.getDualYieldTokenID(proxyStakeAddress),
        ]);

        if (tokens[0].tokenID !== lpFarmTokenID) {
            throw new Error('invalid lp farm token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (
                inputToken.tokenID !== dualYieldTokenID ||
                inputToken.nonce === 0
            ) {
                throw new Error('invalid dual yield token provided');
            }
        }
    }
}

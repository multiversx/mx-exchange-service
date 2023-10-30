import { Address, BigUIntValue, TokenTransfer } from '@multiversx/sdk-core';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { mxConfig, gasConfig } from 'src/config';
import { ruleOfThree } from 'src/helpers/helpers';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { PairService } from 'src/modules/pair/services/pair.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import {
    ClaimDualYieldArgs,
    ProxyStakeFarmArgs,
    UnstakeFarmTokensArgs,
} from '../models/staking.proxy.args.model';
import { StakingProxyService } from './staking.proxy.service';
import { StakingProxyAbiService } from './staking.proxy.abi.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';

@Injectable()
export class StakingProxyTransactionService {
    constructor(
        private readonly stakeProxyService: StakingProxyService,
        private readonly stakeProxyAbi: StakingProxyAbiService,
        private readonly pairService: PairService,
        private readonly farmFactory: FarmFactoryService,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly stakingAbi: StakingAbiService,
        private readonly mxProxy: MXProxyService,
        private readonly apiService: MXApiService,
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

        const contract = await this.mxProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        const gasLimit =
            args.payments.length > 1
                ? gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge
                : gasConfig.stakeProxy.stakeFarmTokens.default;
        const mappedPayments = args.payments.map((payment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );

        return contract.methodsExplicit
            .stakeFarmTokens()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimDualYield(
        sender: string,
        args: ClaimDualYieldArgs,
    ): Promise<TransactionModel> {
        const dualYieldTokenID = await this.stakeProxyAbi.dualYieldTokenID(
            args.proxyStakingAddress,
        );
        for (const payment of args.payments) {
            if (payment.tokenID !== dualYieldTokenID) {
                throw new Error('invalid dual yield token for claim');
            }
        }

        const contract = await this.mxProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );
        const mappedPayments = args.payments.map((payment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );

        return contract.methodsExplicit
            .claimDualYield()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stakeProxy.claimDualYield)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unstakeFarmTokens(
        sender: string,
        args: UnstakeFarmTokensArgs,
    ): Promise<TransactionModel> {
        const decodedAttributes =
            this.stakeProxyService.decodeDualYieldTokenAttributes({
                batchAttributes: [
                    {
                        identifier: args.payment.tokenID,
                        attributes: args.attributes,
                    },
                ],
            });
        const [farmTokenID, farmAddress] = await Promise.all([
            this.stakeProxyAbi.lpFarmTokenID(args.proxyStakingAddress),
            this.stakeProxyAbi.lpFarmAddress(args.proxyStakingAddress),
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
            this.stakeProxyAbi.pairAddress(args.proxyStakingAddress),
        ]);

        const liquidityPositionAmount = ruleOfThree(
            new BigNumber(args.payment.amount),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        );

        const exitFarmPosition = await this.farmFactory
            .useService(farmAddress)
            .getTokensForExitFarm({
                attributes: farmToken.attributes,
                identifier: farmToken.identifier,
                farmAddress: farmAddress,
                user: sender,
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

        const contract = await this.mxProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        const endpointArgs = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return contract.methodsExplicit
            .unstakeFarmTokens(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.payment.tokenID,
                    args.payment.nonce,
                    new BigNumber(args.payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stakeProxy.unstakeFarmTokens)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async migrateDualYieldTokens(
        proxyStakeAddress: string,
        userAddress: string,
    ): Promise<TransactionModel | undefined> {
        const [dualYieldTokenID, farmAddress, stakingAddress, userNftsCount] =
            await Promise.all([
                this.stakeProxyAbi.dualYieldTokenID(proxyStakeAddress),
                this.stakeProxyAbi.lpFarmAddress(proxyStakeAddress),
                this.stakeProxyAbi.stakingFarmAddress(proxyStakeAddress),
                this.apiService.getNftsCountForUser(userAddress),
            ]);

        const userNfts = await this.apiService.getNftsForUser(
            userAddress,
            0,
            userNftsCount,
            'MetaESDT',
            [dualYieldTokenID],
        );

        if (userNfts.length === 0) {
            return undefined;
        }

        const [farmMigrationNonce, stakingMigrationNonce] = await Promise.all([
            this.farmAbiV2.farmPositionMigrationNonce(farmAddress),
            this.stakingAbi.farmPositionMigrationNonce(stakingAddress),
        ]);

        const userDualYiledTokensAttrs =
            this.stakeProxyService.decodeDualYieldTokenAttributes({
                batchAttributes: userNfts.map((nft) => {
                    return {
                        identifier: nft.identifier,
                        attributes: nft.attributes,
                    };
                }),
            });

        const payments: InputTokenModel[] = [];
        userDualYiledTokensAttrs.forEach(
            (dualYieldTokenAttrs, index: number) => {
                if (
                    dualYieldTokenAttrs.lpFarmTokenNonce < farmMigrationNonce ||
                    dualYieldTokenAttrs.stakingFarmTokenNonce <
                        stakingMigrationNonce
                ) {
                    payments.push({
                        tokenID: userNfts[index].collection,
                        nonce: userNfts[index].nonce,
                        amount: userNfts[index].balance,
                    });
                }
            },
        );

        if (payments.length > 0) {
            return this.claimDualYield(userAddress, {
                proxyStakingAddress: proxyStakeAddress,
                payments: payments,
            });
        }

        return undefined;
    }

    private async validateInputTokens(
        proxyStakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [lpFarmTokenID, dualYieldTokenID] = await Promise.all([
            this.stakeProxyAbi.lpFarmTokenID(proxyStakeAddress),
            this.stakeProxyAbi.dualYieldTokenID(proxyStakeAddress),
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

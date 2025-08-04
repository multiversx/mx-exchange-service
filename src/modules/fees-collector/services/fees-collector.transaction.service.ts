import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { FeesCollectorTransactionModel } from '../models/fees-collector.model';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { constantsConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    Address,
    AddressType,
    AddressValue,
    BigUIntValue,
    Field,
    Struct,
    TokenIdentifierType,
    TokenIdentifierValue,
    TypedValue,
    U64Value,
    VariadicType,
    VariadicValue,
} from '@multiversx/sdk-core';
import { TransactionOptions } from 'src/modules/common/transaction.options';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { EgldOrEsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import BigNumber from 'bignumber.js';

@Injectable()
export class FeesCollectorTransactionService {
    constructor(
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    async claimRewardsBatch(
        scAddress: string,
        userAddress: string,
    ): Promise<FeesCollectorTransactionModel> {
        const [currentWeek, lastActiveWeekForUser] = await Promise.all([
            this.weekTimekeepingAbi.currentWeek(scAddress),
            this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                scAddress,
                userAddress,
            ),
        ]);

        const weekToClaim = Math.min(
            constantsConfig.USER_MAX_CLAIM_WEEKS,
            currentWeek - lastActiveWeekForUser,
        );
        const transaction = await this.claimRewards(
            userAddress,
            weekToClaim * gasConfig.feesCollector.claimRewardsPerWeek +
                gasConfig.feesCollector.baseClaimRewards,
        );
        const claimTransaction = new FeesCollectorTransactionModel({
            transaction: transaction,
            count: 0,
        });

        if (
            lastActiveWeekForUser === 0 ||
            lastActiveWeekForUser >= currentWeek
        ) {
            return claimTransaction;
        }

        claimTransaction.count = 1;
        return claimTransaction;
    }

    async claimRewards(
        sender: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFeesCollectorSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'claimRewards',
            }),
        );
    }

    async redistributeRewards(sender: string): Promise<TransactionModel> {
        return this.mxProxy.getFeesCollectorSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.feesCollector.redistributeRewards,
                function: 'redistributeRewards',
            }),
        );
    }

    async updateEnergyForUser(userAddress: string): Promise<TransactionModel> {
        return this.mxProxy.getFeesCollectorSmartContractTransaction(
            new TransactionOptions({
                sender: userAddress,
                gasLimit: gasConfig.feesCollector.updateEnergyForUser,
                function: 'updateEnergyForUser',
                arguments: [
                    new AddressValue(Address.newFromBech32(userAddress)),
                ],
            }),
        );
    }

    async handleKnownContracts(
        sender: string,
        pairAddresses: string[],
        remove = false,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFeesCollectorSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.feesCollector.addKnownContracts,
                function: remove ? 'removeKnownContracts' : 'addKnownContracts',
                arguments: [
                    new VariadicValue(
                        new VariadicType(new AddressType(), false),
                        pairAddresses.map(
                            (address) =>
                                new AddressValue(
                                    Address.newFromBech32(address),
                                ),
                        ),
                    ),
                ],
            }),
        );
    }

    async removeRewardTokens(
        sender: string,
        tokenIDs: string[],
    ): Promise<TransactionModel> {
        return this.mxProxy.getFeesCollectorSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.feesCollector.removeRewardTokens,
                function: 'removeRewardTokens',
                arguments: [
                    new VariadicValue(
                        new VariadicType(new TokenIdentifierType(), false),
                        tokenIDs.map((id) => new TokenIdentifierValue(id)),
                    ),
                ],
            }),
        );
    }

    async swapTokenToBaseToken(
        sender: string,
        tokenToSend: EsdtTokenPayment,
        swapArgs: TypedValue[],
    ): Promise<TransactionModel> {
        let gasLimit = gasConfig.feesCollector.swapTokenToBaseToken;

        const routes = Math.trunc(swapArgs.length / 4);
        gasLimit += routes * gasConfig.router.multiPairSwapMultiplier;

        return this.mxProxy.getFeesCollectorSmartContractTransaction(
            new TransactionOptions({
                sender,
                gasLimit,
                function: 'swapTokenToBaseToken',
                arguments: [
                    new Struct(EgldOrEsdtTokenPayment.getStructure(), [
                        new Field(
                            new TokenIdentifierValue(
                                tokenToSend.tokenIdentifier,
                            ),
                            'token_identifier',
                        ),
                        new Field(
                            new U64Value(new BigNumber(tokenToSend.tokenNonce)),
                            'token_nonce',
                        ),
                        new Field(
                            new BigUIntValue(new BigNumber(tokenToSend.amount)),
                            'amount',
                        ),
                    ]),
                    VariadicValue.fromItems(...swapArgs),
                ],
            }),
        );
    }
}

import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { FeesCollectorTransactionModel } from '../models/fees-collector.model';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { constantsConfig, gasConfig, mxConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    Address,
    AddressType,
    AddressValue,
    TokenIdentifierType,
    TokenIdentifierValue,
    VariadicType,
    VariadicValue,
} from '@multiversx/sdk-core/out';

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

    async claimRewards(gasLimit: number): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .claimRewards()
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async updateEnergyForUser(userAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .updateEnergyForUser([
                new AddressValue(Address.fromString(userAddress)),
            ])
            .withGasLimit(gasConfig.feesCollector.updateEnergyForUser)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async handleKnownContracts(
        pairAddresses: string[],
        remove = false,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const endpointArgs = [
            new VariadicValue(
                new VariadicType(new AddressType(), false),
                pairAddresses.map(
                    (address) => new AddressValue(Address.fromString(address)),
                ),
            ),
        ];
        const interaction = remove
            ? contract.methodsExplicit.removeKnownContracts(endpointArgs)
            : contract.methodsExplicit.addKnownContracts(endpointArgs);

        return interaction
            .withGasLimit(gasConfig.feesCollector.addKnownContracts)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async handleKnownTokens(
        tokenIDs: string[],
        remove = false,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const endpointArgs = [
            new VariadicValue(
                new VariadicType(new TokenIdentifierType(), false),
                tokenIDs.map((id) => new TokenIdentifierValue(id)),
            ),
        ];
        const interaction = remove
            ? contract.methodsExplicit.removeKnownTokens(endpointArgs)
            : contract.methodsExplicit.addKnownTokens(endpointArgs);

        return interaction
            .withGasLimit(gasConfig.feesCollector.addKnownTokens)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}

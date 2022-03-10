import {
    Address,
    AddressValue,
    Interaction,
    QueryResponseBundle,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { UserEntryModel } from '../models/metabonding.model';

@Injectable()
export class MetabondingAbiService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getGenericData(
        contract: SmartContractProfiler,
        interaction: Interaction,
    ): Promise<QueryResponseBundle> {
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            return interaction.interpretQueryResponse(queryResponse);
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                MetabondingAbiService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getLockedAssetTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getTotalLockedAssetSupply(): Promise<string> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methods.getTotalLockedAssetSupply(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getStakedAmountForUser(userAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methods.getStakedAmountForUser(
            [new AddressValue(Address.fromString(userAddress))],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUserEntry(userAddress: string): Promise<UserEntryModel> {
        const contract = await this.elrondProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methods.getUserEntry([
            new AddressValue(Address.fromString(userAddress)),
        ]);

        const response = await this.getGenericData(contract, interaction);

        const rawUserEntry = response.firstValue.valueOf();

        if (!rawUserEntry) {
            throw new Error(`No staking position for ${userAddress}`);
        }

        return new UserEntryModel({
            tokenNonce: rawUserEntry.token_nonce.toNumber(),
            stakedAmount: rawUserEntry.stake_amount.toFixed(),
            unstakedAmount: rawUserEntry.unstake_amount.toFixed(),
            unbondEpoch: rawUserEntry.unbond_epoch.toNumber(),
        });
    }
}

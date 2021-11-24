import { Inject, Injectable } from '@nestjs/common';
import { Address, QueryResponseBundle } from '@elrondnetwork/erdjs';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';
import { CommunityDistributionModel } from '../models/distribution.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';

@Injectable()
export class AbiDistributionService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getGenericData(
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
                AbiDistributionService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionAmountAndEpoch(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return new CommunityDistributionModel({
            amount: response.values[0].valueOf(),
            epoch: response.values[1].valueOf(),
        });
    }

    async getDistributedLockedAssets(userAddress: string): Promise<BigNumber> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.calculateLockedAssets(
            [BytesValue.fromHex(new Address(userAddress).hex())],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }
}

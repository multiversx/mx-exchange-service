import { Inject, Injectable } from '@nestjs/common';
import { Address, AddressValue, Interaction } from '@multiversx/sdk-core';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';
import { CommunityDistributionModel } from '../models/distribution.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiDistributionService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLastCommunityDistributionAmountAndEpoch();
        const response = await this.getGenericData(interaction);
        return new CommunityDistributionModel({
            amount: response.values[0].valueOf(),
            epoch: response.values[1].valueOf(),
        });
    }

    async getDistributedLockedAssets(userAddress: string): Promise<BigNumber> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.calculateLockedAssets([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}

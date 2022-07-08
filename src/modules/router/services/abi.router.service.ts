import { Interaction } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { EnableSwapByUserConfig } from '../models/factory.model';
import { PairMetadata } from '../models/pair.metadata.model';

@Injectable()
export class AbiRouterService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getAllPairsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getAllPairsManagedAddresses();

        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(pairAddress => {
            return pairAddress.toString();
        });
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getAllPairContractMetadata();

        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(v => {
            return new PairMetadata({
                firstTokenID: v.first_token_id.toString(),
                secondTokenID: v.second_token_id.toString(),
                address: v.address.toString(),
            });
        });
    }

    async getEnableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getEnableSwapByUserConfig();

        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );

        const rawConfig = response.firstValue.valueOf();
        return new EnableSwapByUserConfig({
            lockedTokenID: rawConfig.locked_token_id,
            minLockedTokenValue: rawConfig.min_locked_token_value.toFixed(),
            minLockPeriodEpochs: rawConfig.min_lock_period_epochs.toFixed(),
        });
    }

    async getCommonTokensForUserPairs(): Promise<string[]> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getCommonTokensForUserPairs();

        const response = await this.getGenericData(
            AbiRouterService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }
}

import { Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairTokens } from 'src/modules/pair/models/pair.model';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { EnableSwapByUserConfig } from '../models/factory.model';
import { PairMetadata } from '../models/pair.metadata.model';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { IRouterAbiService } from './interfaces';

@Injectable()
export class RouterAbiService
    extends GenericAbiService
    implements IRouterAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute(),
    })
    async pairsAddress(): Promise<string[]> {
        return await this.getAllPairsAddressRaw();
    }

    async getAllPairsAddressRaw(): Promise<string[]> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllPairsManagedAddresses();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((pairAddress) => {
            return pairAddress.toString();
        });
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute(),
    })
    async pairsMetadata(): Promise<PairMetadata[]> {
        return await this.getPairsMetadataRaw();
    }

    async getPairsMetadataRaw(): Promise<PairMetadata[]> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllPairContractMetadata();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((v) => {
            return new PairMetadata({
                firstTokenID: v.first_token_id.toString(),
                secondTokenID: v.second_token_id.toString(),
                address: v.address.toString(),
            });
        });
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async pairCreationEnabled(): Promise<boolean> {
        return await this.getPairCreationEnabledRaw();
    }

    async getPairCreationEnabledRaw(): Promise<boolean> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getPairCreationEnabled();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute(),
    })
    async lastErrorMessage(): Promise<string> {
        return await this.getLastErrorMessageRaw();
    }

    async getLastErrorMessageRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async state(): Promise<boolean> {
        return await this.getStateRaw();
    }

    async getStateRaw(): Promise<boolean> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getState();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async owner(): Promise<string> {
        return await this.getOwnerRaw();
    }

    async getOwnerRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getOwner();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async allPairTokens(): Promise<PairTokens[]> {
        return await this.getAllPairTokensRaw();
    }

    async getAllPairTokensRaw(): Promise<PairTokens[]> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllPairTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((v) => {
            return new PairTokens({
                firstTokenID: v.first_token_id.toString(),
                secondTokenID: v.second_token_id.toString(),
            });
        });
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async pairTemplateAddress(): Promise<string> {
        return await this.getPairTemplateAddressRaw();
    }

    async getPairTemplateAddressRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getPairTemplateAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute() * 10,
    })
    async temporaryOwnerPeriod(): Promise<string> {
        return await this.getTemporaryOwnerPeriodRaw();
    }

    async getTemporaryOwnerPeriodRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getTemporaryOwnerPeriod();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async enableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        return await this.getEnableSwapByUserConfigRaw();
    }

    async getEnableSwapByUserConfigRaw(): Promise<EnableSwapByUserConfig> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnableSwapByUserConfig();

        const response = await this.getGenericData(interaction);

        const rawConfig = response.firstValue.valueOf();
        const minLockedTokenValue = new BigNumber(
            rawConfig.min_locked_token_value,
        ).plus('5e6');
        return new EnableSwapByUserConfig({
            lockedTokenID: rawConfig.locked_token_id,
            minLockedTokenValue: minLockedTokenValue.toFixed(),
            minLockPeriodEpochs: rawConfig.min_lock_period_epochs.toNumber(),
        });
    }

    @ErrorLoggerAsync({
        className: RouterAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async commonTokensForUserPairs(): Promise<string[]> {
        return await this.getCommonTokensForUserPairsRaw();
    }

    async getCommonTokensForUserPairsRaw(): Promise<string[]> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getCommonTokensForUserPairs();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}

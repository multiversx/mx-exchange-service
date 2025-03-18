import {
    Interaction,
    ReturnCode,
    TokenIdentifierValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairTokens } from 'src/modules/pair/models/pair.model';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { EnableSwapByUserConfig } from '../models/factory.model';
import { PairMetadata } from '../models/pair.metadata.model';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IRouterAbiService } from './interfaces';
import { constantsConfig } from 'src/config';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class RouterAbiService
    extends GenericAbiService
    implements IRouterAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async pairsAddress(): Promise<string[]> {
        return this.getAllPairsAddressRaw();
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async pairsMetadata(): Promise<PairMetadata[]> {
        return this.getPairsMetadataRaw();
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async pairCreationEnabled(): Promise<boolean> {
        return this.getPairCreationEnabledRaw();
    }

    async getPairCreationEnabledRaw(): Promise<boolean> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getPairCreationEnabled();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async state(): Promise<boolean> {
        return this.getStateRaw();
    }

    async getStateRaw(): Promise<boolean> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getState();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async owner(): Promise<string> {
        return this.getOwnerRaw();
    }

    async getOwnerRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getOwner();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async allPairTokens(): Promise<PairTokens[]> {
        return this.getAllPairTokensRaw();
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async pairTemplateAddress(): Promise<string> {
        return this.getPairTemplateAddressRaw();
    }

    async getPairTemplateAddressRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getPairTemplateAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneMinute() * 10,
    })
    async temporaryOwnerPeriod(): Promise<string> {
        return this.getTemporaryOwnerPeriodRaw();
    }

    async getTemporaryOwnerPeriodRaw(): Promise<string> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getTemporaryOwnerPeriod();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async enableSwapByUserConfig(
        tokenID: string,
    ): Promise<EnableSwapByUserConfig> {
        return this.getEnableSwapByUserConfigRaw(tokenID);
    }

    async getEnableSwapByUserConfigRaw(
        tokenID: string,
    ): Promise<EnableSwapByUserConfig> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnableSwapByUserConfig([
                TokenIdentifierValue.esdtTokenIdentifier(tokenID),
            ]);

        const response = await this.getGenericData(interaction);

        if (
            response.returnCode.equals(ReturnCode.UserError) &&
            response.returnMessage === 'No config set'
        ) {
            return undefined;
        }

        const rawConfig = response.firstValue.valueOf();
        const minLockedTokenValue = new BigNumber(
            rawConfig.min_locked_token_value,
        ).plus(constantsConfig.roundedSwapEnable[tokenID]);
        return new EnableSwapByUserConfig({
            lockedTokenID: rawConfig.locked_token_id,
            commonTokenID: tokenID,
            minLockedTokenValue: minLockedTokenValue.toFixed(),
            minLockPeriodEpochs: rawConfig.min_lock_period_epochs.toNumber(),
        });
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async commonTokensForUserPairs(): Promise<string[]> {
        return this.getCommonTokensForUserPairsRaw();
    }

    async getCommonTokensForUserPairsRaw(): Promise<string[]> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getCommonTokensForUserPairs();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}

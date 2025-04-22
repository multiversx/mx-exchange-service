import { Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import {
    Interaction,
    TokenIdentifierValue,
    TypedValue,
    U32Value,
} from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { IFeesCollectorAbiService } from './interfaces';

@Injectable()
export class FeesCollectorAbiService
    extends GenericAbiService
    implements IFeesCollectorAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async accumulatedFees(week: number, token: string): Promise<string> {
        return this.getAccumulatedFeesRaw(week, token);
    }

    async getAccumulatedFeesRaw(week: number, token: string): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedFees([
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue().toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async lockedTokenID(): Promise<string> {
        return this.getLockedTokenIDRaw();
    }

    async getLockedTokenIDRaw(): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async lockedTokensPerBlock(): Promise<string> {
        return this.getLockedTokensPerBlockRaw();
    }

    async getLockedTokensPerBlockRaw(): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokensPerBlock();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async allTokens(): Promise<string[]> {
        return this.getAllTokensRaw();
    }

    async getAllTokensRaw(): Promise<string[]> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async knownContracts(): Promise<string[]> {
        return this.getKnownContractsRaw();
    }

    async getKnownContractsRaw(): Promise<string[]> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllKnownContracts();
        const response = await this.getGenericData(interaction);
        return response.firstValue
            .valueOf()
            .map((value: TypedValue) => value.valueOf().bech32());
    }
}

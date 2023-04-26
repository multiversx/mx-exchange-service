import { Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import {
    Interaction,
    TokenIdentifierValue,
    U32Value,
} from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
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
        className: FeesCollectorAbiService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async accumulatedFees(week: number, token: string): Promise<string> {
        return await this.getAccumulatedFeesRaw(week, token);
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

    @ErrorLoggerAsync({
        className: FeesCollectorAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async lockedTokenID(): Promise<string> {
        return await this.getLockedTokenIDRaw();
    }

    async getLockedTokenIDRaw(): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({
        className: FeesCollectorAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async lockedTokensPerBlock(): Promise<string> {
        return await this.getLockedTokensPerBlockRaw();
    }

    async getLockedTokensPerBlockRaw(): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokensPerBlock();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        className: FeesCollectorAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async allTokens(): Promise<string[]> {
        return await this.getAllTokensRaw();
    }

    async getAllTokensRaw(): Promise<string[]> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}

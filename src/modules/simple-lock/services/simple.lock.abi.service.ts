import { Interaction, TypedValue } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ISimpleLockAbiService } from './interfaces';

@Injectable()
export class SimpleLockAbiService
    extends GenericAbiService
    implements ISimpleLockAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'simpleLock',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async lockedTokenID(simpleLockAddress: string): Promise<string> {
        return this.getlockedTokenIDRaw(simpleLockAddress);
    }

    async getlockedTokenIDRaw(simpleLockAddress: string): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'simpleLock',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async lpProxyTokenID(simpleLockAddress: string): Promise<string> {
        return this.getLpProxyTokenIDRaw(simpleLockAddress);
    }

    async getLpProxyTokenIDRaw(simpleLockAddress: string): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpProxyTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'simpleLock',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async farmProxyTokenID(simpleLockAddress: string): Promise<string> {
        return this.getFarmProxyTokenIDRaw(simpleLockAddress);
    }

    async getFarmProxyTokenIDRaw(simpleLockAddress: string): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmProxyTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'simpleLock',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async intermediatedPairs(simpleLockAddress: string): Promise<string[]> {
        return this.getIntermediatedPairsRaw(simpleLockAddress);
    }

    async getIntermediatedPairsRaw(
        simpleLockAddress: string,
    ): Promise<string[]> {
        const contract = await this.mxProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getKnownLiquidityPools();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((pairAddress: TypedValue) => {
            return pairAddress.valueOf().toString();
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'simpleLock',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async intermediatedFarms(simpleLockAddress: string): Promise<string[]> {
        return this.getIntermediatedFarmsRaw(simpleLockAddress);
    }

    async getIntermediatedFarmsRaw(
        simpleLockAddress: string,
    ): Promise<string[]> {
        const contract = await this.mxProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getKnownFarms();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((farmAddress: TypedValue) => {
            return farmAddress.valueOf().toString();
        });
    }
}

import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Address, AddressValue, Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { UnstakePairModel } from '../models/token.unstake.model';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ITokenUnstakeAbiService } from './interfaces';

@Injectable()
export class TokenUnstakeAbiService
    extends GenericAbiService
    implements ITokenUnstakeAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'tokenUnstake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async unbondEpochs(): Promise<number> {
        return await this.getUnbondEpochsRaw();
    }

    async getUnbondEpochsRaw(): Promise<number> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getUnbondEpochs();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'tokenUnstake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesBurnPercentage(): Promise<number> {
        return await this.getFeesBurnPercentageRaw();
    }

    async getFeesBurnPercentageRaw(): Promise<number> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesBurnPercentage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'tokenUnstake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesCollectorAddress(): Promise<string> {
        return await this.feesCollectorAddressRaw();
    }

    async feesCollectorAddressRaw(): Promise<string> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesCollectorAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'tokenUnstake',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(): Promise<string> {
        return await this.getEnergyFactoryAddressRaw();
    }

    async getEnergyFactoryAddressRaw(): Promise<string> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({ logArgs: true })
    async unlockedTokensForUser(
        userAddress: string,
    ): Promise<UnstakePairModel[]> {
        return await this.getUnlockedTokensForUserRaw(userAddress);
    }

    async getUnlockedTokensForUserRaw(
        userAddress: string,
    ): Promise<UnstakePairModel[]> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getUnlockedTokensForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map(
            (unstakePair) =>
                new UnstakePairModel({
                    unlockEpoch: unstakePair.unlock_epoch.toNumber(),
                    lockedTokens: new EsdtTokenPaymentModel(
                        EsdtTokenPayment.fromDecodedAttributes(
                            unstakePair.locked_tokens,
                        ).toJSON(),
                    ),
                    unlockedTokens: new EsdtTokenPaymentModel(
                        EsdtTokenPayment.fromDecodedAttributes(
                            unstakePair.unlocked_tokens,
                        ).toJSON(),
                    ),
                }),
        );
    }
}

import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Address, AddressValue, Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { UnstakePairModel } from '../models/token.unstake.model';

@Injectable()
export class TokenUnstakeAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async getUnbondEpochs(): Promise<number> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getUnbondEpochs();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getFeesBurnPercentage(): Promise<number> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesBurnPercentage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getFeesCollectorAddress(): Promise<string> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesCollectorAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async getLastEpochFeeSentToCollector(): Promise<number> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLastEpochFeeSentToCollector();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getEnergyFactoryAddress(): Promise<string> {
        const contract = await this.mxProxy.getTokenUnstakeContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async getUnlockedTokensForUser(
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

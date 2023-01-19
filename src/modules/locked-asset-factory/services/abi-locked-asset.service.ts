import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@multiversx/sdk-core/out/smartcontracts/interaction';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiLockedAssetService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(mxProxy, logger);
    }

    async getAssetTokenID(): Promise<string> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAssetTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLockedTokenID(): Promise<string> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedAssetTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getDefaultUnlockPeriod();
        const response = await this.getGenericData(interaction);
        return response.firstValue
            .valueOf()
            .unlock_milestones.map((unlockMilestone) => {
                return new UnlockMileStoneModel({
                    epochs: unlockMilestone.unlock_epoch.toNumber(),
                    percent: unlockMilestone.unlock_percent.toNumber(),
                });
            });
    }

    async getInitEpoch(): Promise<number> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getInitEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getExtendedAttributesActivationNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }
}

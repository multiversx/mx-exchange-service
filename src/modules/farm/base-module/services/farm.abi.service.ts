import { Inject } from '@nestjs/common';
import {
    BigUIntValue,
    BytesValue,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { Address, Interaction, ReturnCode } from '@multiversx/sdk-core';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { MXProxyService } from '../../../../services/multiversx-communication/mx.proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

export class AbiFarmService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly gatewayService: MXGatewayService,
    ) {
        super(mxProxy, logger);
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getRewardTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmingTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenSupply();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getPerBlockRewardAmount();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyPercent();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getMinimumFarmingEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getRewardPerShare();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardReserve(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getRewardReserve();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastRewardBlockNonce();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getDivisionSafetyConstant();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new BigUIntValue(new BigNumber(args.liquidity)),
                BytesValue.fromHex(
                    Buffer.from(args.attributes, 'base64').toString('hex'),
                ),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction = contract.methodsExplicit.getState();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().name;
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    async getBurnGasLimit(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getBurnGasLimit();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTransferExecGasLimit(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTransferExecGasLimit();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPairContractManagedAddress(farmAddress: string): Promise<string> {
        try {
            const contract = await this.mxProxy.getFarmSmartContract(
                farmAddress,
            );
            const interaction: Interaction =
                contract.methodsExplicit.getPairContractManagedAddress();
            const response = await this.getGenericData(interaction);
            if (response.returnCode.equals(ReturnCode.FunctionNotFound)) {
                return Address.Zero().bech32();
            }
            return response.firstValue.valueOf().bech32();
        } catch {
            return undefined;
        }
    }

    async getLockedAssetFactoryManagedAddress(
        farmAddress: string,
    ): Promise<string> {
        try {
            const contract = await this.mxProxy.getFarmSmartContract(
                farmAddress,
            );
            const interaction: Interaction =
                contract.methodsExplicit.getLockedAssetFactoryManagedAddress();
            const response = await this.getGenericData(interaction);
            return response.firstValue.valueOf().bech32();
        } catch {
            return undefined;
        }
    }

    async getLastErrorMessage(farmAddress: string): Promise<string> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastErrorMessage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}

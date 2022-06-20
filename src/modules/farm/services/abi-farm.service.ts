import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    BytesValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    FarmMigrationConfig,
    FarmRewardType,
    FarmVersion,
} from '../models/farm.model';
import { ElrondGatewayService } from 'src/services/elrond-communication/elrond-gateway.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiFarmService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly gatewayService: ElrondGatewayService,
    ) {
        super(elrondProxy, logger);
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRewardTokenId();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmingTokenId();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getWhitelist(farmAddress: string): Promise<string[]> {
        const [
            contract,
            version,
            type,
        ] = await this.elrondProxy.getFarmSmartContract(farmAddress);

        if (type !== FarmRewardType.CUSTOM_REWARDS) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.getWhitelist();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );

        return response.firstValue.valueOf().map(address => address.bech32());
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFarmTokenSupply();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );

        return response.firstValue.valueOf().toFixed();
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methodsExplicit.getFarmingTokenReserve();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getPerBlockRewardAmount();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getPenaltyPercent();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getMinimumFarmingEpoch();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRewardPerShare();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getRewardReserve(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getRewardReserve();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getLastRewardBlockNonce();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methodsExplicit.getUndistributedFees();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methodsExplicit.getCurrentBlockFee();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        const currentBlockFee = response.firstValue.valueOf();
        return currentBlockFee ? currentBlockFee[1].toFixed() : '0';
    }

    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        if (version !== FarmVersion.V1_2) {
            return null;
        }
        const interaction: Interaction = contract.methodsExplicit.getLockedRewardAprMuliplier();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().integerValue();
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getDivisionSafetyConstant();
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.calculateRewardsForGivenPosition(
            [
                new BigUIntValue(new BigNumber(args.liquidity)),
                BytesValue.fromHex(
                    Buffer.from(args.attributes, 'base64').toString('hex'),
                ),
            ],
        );
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf();
    }

    async getState(farmAddress: string): Promise<string> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getState([]);
        const response = await this.getGenericData(
            AbiFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().name;
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        console.log(this.gatewayService.constructor.name);
        const response = await this.gatewayService.getSCStorageKey(
            farmAddress,
            'produce_rewards_enabled',
        );
        return response === '01';
    }

    async getFarmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig | undefined> {
        const [contract, version] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        try {
            const interaction: Interaction = contract.methodsExplicit.getFarmMigrationConfiguration();
            const response = await this.getGenericData(
                AbiFarmService.name,
                interaction,
            );
            const decodedResponse = response.firstValue.valueOf();

            if (version === FarmVersion.V1_2) {
                return new FarmMigrationConfig({
                    migrationRole: decodedResponse.migration_role.name,
                    oldFarmAddress: decodedResponse.old_farm_address.bech32(),
                    oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
                    newFarmAddress: decodedResponse.new_farm_address.bech32(),
                    newLockedFarmAddress: decodedResponse.new_farm_with_lock_address.bech32(),
                });
            }

            return new FarmMigrationConfig({
                migrationRole: decodedResponse.migration_role.name,
                oldFarmAddress: decodedResponse.old_farm_address.bech32(),
                oldFarmTokenID: decodedResponse.old_farm_token_id.toString(),
            });
        } catch (error) {
            return undefined;
        }
    }
}

import { FarmTokenAttributes, FarmVersion } from '@elrondnetwork/erdjs-dex';
import {
    Address,
    AddressValue,
    BigUIntType,
    BigUIntValue,
    BytesValue,
    Field,
    FieldDefinition,
    Interaction,
    Struct,
    StructType,
    U64Type,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { AbiFarmService } from '../farm.abi.service';

@Injectable()
export class FarmV2AbiService extends AbiFarmService {
    async getBoostedYieldsRewardsPercenatage(
        farmAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsRewardsPercenatage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getCurrentWeek(farmAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getEnergyFactoryAddress(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        console.log({
            service: FarmV2AbiService.name,
            method: this.calculateRewardsForGivenPosition.name,
        });
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const decodedAttributes = FarmTokenAttributes.fromAttributes(
            FarmVersion.V2,
            args.attributes,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new AddressValue(Address.fromString(args.user)),
                new BigUIntValue(new BigNumber(args.liquidity)),
                new Struct(
                    new StructType('FarmTokenAttributes', [
                        new FieldDefinition(
                            'reward_per_share',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'original_entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'initial_farming_amount',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'compounded_reward',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'current_farm_amount',
                            '',
                            new BigUIntType(),
                        ),
                    ]),
                    [
                        new Field(
                            new BigUIntValue(
                                new BigNumber(decodedAttributes.rewardPerShare),
                            ),
                            'reward_per_share',
                        ),
                        new Field(
                            new U64Value(
                                new BigNumber(
                                    decodedAttributes.originalEnteringEpoch,
                                ),
                            ),
                            'original_entering_epoch',
                        ),
                        new Field(
                            new U64Value(
                                new BigNumber(decodedAttributes.enteringEpoch),
                            ),
                            'entering_epoch',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.initialFarmingAmount,
                                ),
                            ),
                            'initial_farming_amount',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.compoundedReward,
                                ),
                            ),
                            'compounded_reward',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.currentFarmAmount,
                                ),
                            ),
                            'current_farm_amount',
                        ),
                    ],
                ),
            ]);
        const response = await this.getGenericData(interaction);
        console.log(response);
        return response.firstValue.valueOf();
    }
}

import { LockedTokenAttributes } from '@elrondnetwork/erdjs-dex';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { EnergyModel } from '../models/energy.model';
import { EnergyAbiService } from './energy.abi.service';
import { EnergyComputeService } from './energy.compute.service';
import { EnergyGetterService } from './energy.getter.service';

@Injectable()
export class EnergyService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly energyGetter: EnergyGetterService,
        private readonly energyCompute: EnergyComputeService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async getUserEnergy(
        userAddress: string,
        vmQuery = false,
    ): Promise<EnergyModel> {
        if (vmQuery) {
            const userEnergyEntry = await this.energyAbi.getEnergyEntryForUser(
                userAddress,
            );
            return new EnergyModel(userEnergyEntry);
        }
        const [userEnergyEntry, currentEpoch] = await Promise.all([
            this.energyGetter.getEnergyEntryForUser(userAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const depletedEnergy = this.energyCompute.depleteUserEnergy(
            userEnergyEntry,
            currentEpoch,
        );

        return new EnergyModel(depletedEnergy);
    }

    async getPenaltyAmount(
        inputToken: InputTokenModel,
        epochsToReduce: number,
        vmQuery = false,
    ): Promise<string> {
        const decodedAttributes = LockedTokenAttributes.fromAttributes(
            inputToken.attributes,
        );
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const prevLockEpochs = decodedAttributes.unlockEpoch - currentEpoch;

        epochsToReduce = epochsToReduce + (currentEpoch + prevLockEpochs - epochsToReduce) % 30
        if (vmQuery) {
            return await this.energyAbi.getPenaltyAmount(
                new BigNumber(inputToken.amount),
                prevLockEpochs,
                epochsToReduce,
            );
        }

        return (
            await this.energyCompute.computePenaltyAmount(
                new BigNumber(inputToken.amount),
                prevLockEpochs,
                epochsToReduce,
            )
        ).toFixed();
    }
}

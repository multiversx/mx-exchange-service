import { LockedTokenAttributes } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { EnergyModel } from '../models/energy.model';
import { EnergyAbiService } from './energy.abi.service';
import { EnergyComputeService } from './energy.compute.service';
import { EnergyGetterService } from './energy.getter.service';
import { constantsConfig } from '../../../config';

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
        newLockPeriod: number,
        vmQuery = false,
    ): Promise<string> {
        const decodedAttributes = LockedTokenAttributes.fromAttributes(
            inputToken.attributes,
        );
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const isFullUnlock = newLockPeriod === 0;
        if (!isFullUnlock) {
            const lockOptions = await this.energyGetter.getLockOptions();
            if (
                lockOptions.find(
                    (lockOption) => lockOption.lockEpochs === newLockPeriod,
                ) === undefined
            ) {
                throw new Error('Invalid new lock epochs');
            }

            const tentativeNewUnlockEpoch = currentEpoch + newLockPeriod;
            const startOfMonthEpoch = this.unlockEpochToStartOfMonth(
                tentativeNewUnlockEpoch,
            );
            const epochsDiffFromMonthStart =
                tentativeNewUnlockEpoch - startOfMonthEpoch;
            newLockPeriod = newLockPeriod - epochsDiffFromMonthStart;
        }

        const prevLockEpochs = decodedAttributes.unlockEpoch - currentEpoch;
        if (prevLockEpochs <= 0) {
            return '0';
        }

        if (newLockPeriod > prevLockEpochs) {
            throw new Error('Invalid new lock epoch');
        }

        if (vmQuery) {
            return await this.energyAbi.getPenaltyAmount(
                new BigNumber(inputToken.amount),
                prevLockEpochs,
                newLockPeriod,
            );
        }

        return (
            await this.energyCompute.computePenaltyAmount(
                new BigNumber(inputToken.amount),
                prevLockEpochs,
                newLockPeriod,
            )
        ).toFixed();
    }

    private unlockEpochToStartOfMonth(unlockEpoch: number): number {
        const extraDays = unlockEpoch % constantsConfig.EPOCHS_IN_MONTH;
        return unlockEpoch - extraDays;
    }
}

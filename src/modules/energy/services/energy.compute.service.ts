import { EnergyType } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig, leaguesConfig } from 'src/config';
import { LockOption } from '../models/simple.lock.energy.model';
import { IEnergyComputeService } from './interfaces';
import { EnergyAbiService } from './energy.abi.service';
import { denominateAmount } from 'src/utils/token.converters';

@Injectable()
export class EnergyComputeService implements IEnergyComputeService {
    constructor(private readonly energyAbi: EnergyAbiService) {}

    depleteUserEnergy(
        energyEntry: EnergyType,
        currentEpoch: number,
    ): EnergyType {
        if (energyEntry.lastUpdateEpoch === currentEpoch) {
            energyEntry;
        }

        if (
            new BigNumber(energyEntry.totalLockedTokens).isPositive() &&
            energyEntry.lastUpdateEpoch > 0
        ) {
            if (energyEntry.lastUpdateEpoch >= currentEpoch) {
                return energyEntry;
            }

            const epcohDiff = currentEpoch - energyEntry.lastUpdateEpoch;
            const energyDecrease = new BigNumber(
                energyEntry.totalLockedTokens,
            ).multipliedBy(epcohDiff);
            energyEntry.amount = new BigNumber(energyEntry.amount)
                .minus(energyDecrease)
                .toFixed();
        }

        return energyEntry;
    }

    async computePenaltyAmount(
        tokenAmount: BigNumber,
        prevLockEpochs: number,
        newLockEpochs: number,
    ): Promise<BigNumber> {
        const isFullUnlock = newLockEpochs === 0;

        const penaltyPercentageUnlock = isFullUnlock
            ? await this.computePenaltyPercentageFullUnlock(prevLockEpochs)
            : await this.computePenaltyPercentagePartialUnlock(
                  prevLockEpochs,
                  newLockEpochs,
              );

        return tokenAmount
            .multipliedBy(penaltyPercentageUnlock)
            .dividedBy(constantsConfig.MAX_PENALTY_PERCENT);
    }

    public computeLeagueByEnergy(energyRaw: string): string {
        const energy = new BigNumber(energyRaw);

        for (const league of leaguesConfig) {
            const min = league.minEnergy ?? new BigNumber(0);
            const max = league.maxEnergy ?? new BigNumber(Infinity);

            const inInterval =
                energy.isGreaterThanOrEqualTo(min) && energy.isLessThan(max);
            if (inInterval) {
                return league.name;
            }
        }

        return '';
    }

    private async computePenaltyPercentageFullUnlock(
        lockEpochsRemaining: number,
    ): Promise<number> {
        const lockOptions = await this.energyAbi.lockOptions();
        const lastLockOption = lockOptions[lockOptions.length - 1];

        if (lockEpochsRemaining > lastLockOption.lockEpochs) {
            throw new Error('Invalid lock epochs');
        }

        let prevOption = new LockOption({
            lockEpochs: 0,
            penaltyStartPercentage: 0,
        });
        let nextOption = new LockOption({
            lockEpochs: 0,
            penaltyStartPercentage: 0,
        });

        const firstLockOption = lockOptions[0];
        if (lockEpochsRemaining > firstLockOption.lockEpochs) {
            for (let index = 0; index < lockOptions.length - 1; index++) {
                const prevOptionTemp = lockOptions[index];
                const nextOptionTemp = lockOptions[index + 1];
                if (
                    prevOptionTemp.lockEpochs <= lockEpochsRemaining &&
                    lockEpochsRemaining <= nextOptionTemp.lockEpochs
                ) {
                    prevOption = prevOptionTemp;
                    nextOption = nextOptionTemp;
                    break;
                }
            }
        } else {
            nextOption = firstLockOption;
        }

        return this.linearInterpolation(
            prevOption.lockEpochs,
            nextOption.lockEpochs,
            lockEpochsRemaining,
            prevOption.penaltyStartPercentage,
            nextOption.penaltyStartPercentage,
        );
    }

    private async computePenaltyPercentagePartialUnlock(
        prevLockEpochsRemaining: number,
        newLockEpochsRemaining: number,
    ): Promise<number> {
        const [prevPenaltyPercentageFull, newPenaltyPercentage] =
            await Promise.all([
                this.computePenaltyPercentageFullUnlock(
                    prevLockEpochsRemaining,
                ),
                await this.computePenaltyPercentageFullUnlock(
                    newLockEpochsRemaining,
                ),
            ]);

        return Math.trunc(
            ((prevPenaltyPercentageFull - newPenaltyPercentage) *
                constantsConfig.MAX_PENALTY_PERCENT) /
                (constantsConfig.MAX_PENALTY_PERCENT - newPenaltyPercentage),
        );
    }

    /// out = (min_out * (max_in - current_in) + max_out * (current_in - min_in)) / (max_in - min_in)
    /// https://en.wikipedia.org/wiki/Linear_interpolation
    private linearInterpolation(
        minIn: number,
        maxIn: number,
        currentIn: number,
        minOut: number,
        maxOut: number,
    ): number {
        if (currentIn < minIn || currentIn > maxIn) {
            throw new Error('Invalid values');
        }

        const minOutWeighted = (maxIn - currentIn) * minOut;
        const maxOutWeighted = (currentIn - minIn) * maxOut;
        const inDiff = maxIn - minIn;

        return Math.trunc((minOutWeighted + maxOutWeighted) / inDiff);
    }
}

import { LockedTokenAttributes } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { UserEnergyModel } from '../models/energy.model';
import { EnergyAbiService } from './energy.abi.service';
import { EnergyComputeService } from './energy.compute.service';
import { constantsConfig } from '../../../config';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class EnergyService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly energyCompute: EnergyComputeService,
        private readonly contextGetter: ContextGetterService,
        private readonly tokenService: TokenService,
    ) {}

    async getBaseAssetToken(): Promise<EsdtToken> {
        const tokenID = await this.energyAbi.baseAssetTokenID();
        return this.tokenService.tokenMetadata(tokenID);
    }

    async getLockedToken(): Promise<NftCollection> {
        const collection = await this.energyAbi.lockedTokenID();
        return this.tokenService.getNftCollectionMetadata(collection);
    }

    async getLegacyLockedToken(): Promise<NftCollection> {
        const collection = await this.energyAbi.legacyLockedTokenID();
        return this.tokenService.getNftCollectionMetadata(collection);
    }

    async getUserEnergy(
        userAddress: string,
        vmQuery = false,
    ): Promise<UserEnergyModel> {
        if (vmQuery) {
            const userEnergyEntry =
                await this.energyAbi.getEnergyEntryForUserRaw(userAddress);
            return new UserEnergyModel(userEnergyEntry);
        }
        const [userEnergyEntry, currentEpoch] = await Promise.all([
            this.energyAbi.energyEntryForUser(userAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const depletedEnergy = this.energyCompute.depleteUserEnergy(
            userEnergyEntry,
            currentEpoch,
        );

        return new UserEnergyModel(depletedEnergy);
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
            const lockOptions = await this.energyAbi.lockOptions();
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
            return this.energyAbi.getPenaltyAmount(
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

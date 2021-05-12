import { Injectable } from '@nestjs/common';
import { GasLimit } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import {
    CommunityDistributionModel,
    DistributionMilestoneModel,
    DistributionModel,
} from '../models/distribution.model';
import { TokenModel } from '../models/pair.model';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { TransactionModel } from '../models/transaction.model';
import { CacheDistributionService } from 'src/services/cache-manager/cache-distribution.service';
import { AbiDistributionService } from './abi-distribution.service';

@Injectable()
export class DistributionService {
    constructor(
        private abiService: AbiDistributionService,
        private cacheService: CacheDistributionService,
        private context: ContextService,
    ) {}

    async getDistributionInfo(): Promise<DistributionModel> {
        const distributionContract = new DistributionModel();
        distributionContract.address = elrondConfig.distributionAddress;
        return distributionContract;
    }

    async getDistributedToken(): Promise<TokenModel> {
        const cachedData = await this.cacheService.getDistributedTokenID();
        if (!!cachedData) {
            return this.context.getTokenMetadata(cachedData.distributedTokenID);
        }

        const distributedTokenID = await this.abiService.getDistributedTokenID();
        this.cacheService.setDistributedTokenID({
            distributedTokenID: distributedTokenID,
        });

        return this.context.getTokenMetadata(distributedTokenID);
    }

    async getLockedToken(): Promise<TokenModel> {
        const cachedData = await this.cacheService.getLockedTokenID();
        if (!!cachedData) {
            return this.context.getTokenMetadata(cachedData.lockedTokenID);
        }

        const lockedTokenID = await this.abiService.getLockedTokenID();
        this.cacheService.setLockedTokenID({
            lockedTokenID: lockedTokenID,
        });

        return this.context.getTokenMetadata(lockedTokenID);
    }

    async getwrappedLpToken(): Promise<TokenModel> {
        const cachedData = await this.cacheService.getWrappedLpTokenID();
        if (!!cachedData) {
            return this.context.getTokenMetadata(cachedData.wrappedLpTokenID);
        }

        const wrappedLpTokenID = await this.abiService.getWrappedLpTokenID();
        this.cacheService.setWrappedLpTokenID({
            wrappedLpTokenID: wrappedLpTokenID,
        });

        return this.context.getTokenMetadata(wrappedLpTokenID);
    }

    async getwrappedFarmToken(): Promise<TokenModel> {
        const cachedData = await this.cacheService.getWrappedFarmTokenID();
        if (!!cachedData) {
            return this.context.getTokenMetadata(cachedData.wrappedFarmTokenID);
        }

        const wrappedFarmTokenID = await this.abiService.getWrappedFarmTokenID();
        this.cacheService.setWrappedFarmTokenID({
            wrappedFarmTokenID: wrappedFarmTokenID,
        });

        return this.context.getTokenMetadata(wrappedFarmTokenID);
    }

    async getAcceptedLockedAssetsTokens(): Promise<TokenModel[]> {
        const cachedData = await this.cacheService.getAcceptedLockedTokensID();
        if (!!cachedData) {
            const acceptedLockedTokens: TokenModel[] = [];
            for (const tokenID of cachedData.acceptedLockedTokensID) {
                const token = await this.context.getTokenMetadata(
                    tokenID.valueOf(),
                );
                acceptedLockedTokens.push(token);
            }
            return acceptedLockedTokens;
        }

        const acceptedLockedTokensID = await this.abiService.getAcceptedLockedTokensID();
        this.cacheService.setAcceptedLockedTokensID({
            acceptedLockedTokensID: acceptedLockedTokensID,
        });

        const acceptedLockedTokens: TokenModel[] = [];
        for (const tokenID of acceptedLockedTokensID) {
            const token = await this.context.getTokenMetadata(
                tokenID.valueOf(),
            );
            acceptedLockedTokens.push(token);
        }
        return acceptedLockedTokens;
    }

    async getDistributionMilestones(): Promise<DistributionMilestoneModel[]> {
        const cachedData = await this.cacheService.getMilestones();
        if (!!cachedData) {
            return cachedData.milestones;
        }

        const milestones = await this.abiService.getDistributionMilestones();

        this.cacheService.setMilestones({ milestones: milestones });

        return milestones;
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const cachedEpoch = await this.cacheService.getEpoch();
        const cachedAmount = await this.cacheService.getAmount();
        const cachedMilestones = await this.cacheService.getMilestones();

        if (!!cachedEpoch && !!cachedAmount && !!cachedMilestones) {
            return {
                epoch: cachedEpoch.epoch,
                amount: cachedAmount.amount,
                milestones: cachedMilestones.milestones,
            };
        }
        const communityDistribution = await this.abiService.getCommunityDistribution();
        const epoch = communityDistribution[0].valueOf();
        const amount = communityDistribution[1].valueOf();
        const milestones = await this.getDistributionMilestones();

        this.cacheService.setEpoch({ epoch: epoch });
        this.cacheService.setAmount({ amount: amount });

        return {
            epoch: epoch,
            amount: amount,
            milestones: milestones,
        };
    }

    async getIntermediatedPairs(): Promise<string[]> {
        const cachedData = await this.cacheService.getIntermediatedPairsAddress();
        if (!!cachedData) {
            return cachedData.pairs;
        }

        const pairs = await this.abiService.getIntermediatedPairsAddress();

        this.cacheService.setIntermediatedPairsAddress({
            pairs: pairs,
        });

        return pairs;
    }

    async getIntermediatedFarms(): Promise<string[]> {
        const cachedData = await this.cacheService.getIntermediatedFarmsAddress();
        if (!!cachedData) {
            return cachedData.farms;
        }

        const farms = await this.abiService.getIntermediatedFarmsAddress();

        this.cacheService.setIntermediatedFarmsAddress({
            farms: farms,
        });

        return farms;
    }

    async claimAssets(): Promise<TransactionModel> {
        const contract = await this.abiService.getContract();
        const interaction: Interaction = contract.methods.claimAssets([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));

        return transaction.toPlainObject();
    }

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.abiService.getContract();
        const interaction: Interaction = contract.methods.claimLockedAssets([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));

        return transaction.toPlainObject();
    }
}

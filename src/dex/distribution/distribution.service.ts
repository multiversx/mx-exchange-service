import { Injectable } from '@nestjs/common';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
} from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig, gasConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import {
    CommunityDistributionModel,
    DistributionMilestoneModel,
    DistributionModel,
} from '../models/distribution.model';
import { TokenModel } from '../models/pair.model';
import { AbiRegistry } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { TransactionModel } from '../models/transaction.model';
import { CacheDistributionService } from 'src/services/cache-manager/cache-distribution.service';

@Injectable()
export class DistributionService {
    private readonly proxy: ProxyProvider;

    constructor(
        private cacheService: CacheDistributionService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.distribution],
        });
        const abi = new SmartContractAbi(abiRegistry, ['EsdtDistribution']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.distributionAddress),
            abi: abi,
        });

        return contract;
    }

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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getDistributedTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const distributedTokenID = result.firstValue.valueOf();

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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLockedTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const lockedTokenID = result.firstValue.valueOf();
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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getWrappedLpTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedLpTokenID = result.firstValue.valueOf();
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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getWrappedFarmTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedFarmTokenID = result.firstValue.valueOf();
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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getAcceptedLockedAssetsTokenIds(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        this.cacheService.setAcceptedLockedTokensID({
            acceptedLockedTokensID: response.values,
        });

        const acceptedLockedTokens: TokenModel[] = [];
        for (const tokenID of response.values) {
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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionUnlockMilestones(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const milestones: DistributionMilestoneModel[] = result.values.map(
            rawMilestone => {
                const milestone = rawMilestone.valueOf();
                return {
                    unlockEpoch: milestone.unlock_epoch,
                    unlockPercentage: milestone.unlock_precent,
                };
            },
        );

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

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionAmountAndEpoch(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const epoch = result.values[0].valueOf();
        const amount = result.values[1].valueOf();
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

        const contract = await this.getContract();

        const interaction: Interaction = contract.methods.getIntermediatedPairs(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const pairs = result.values.map(pairAddress => {
            return pairAddress.valueOf();
        });

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

        const contract = await this.getContract();

        const interaction: Interaction = contract.methods.getIntermediatedFarms(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const farms = result.values.map(farmAddress => {
            return farmAddress.valueOf();
        });

        this.cacheService.setIntermediatedFarmsAddress({
            farms: farms,
        });

        return farms;
    }

    async claimAssets(): Promise<TransactionModel> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.claimAssets([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));

        return transaction.toPlainObject();
    }

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.claimLockedAssets([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));

        return transaction.toPlainObject();
    }
}

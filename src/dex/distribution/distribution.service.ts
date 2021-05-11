import { Injectable } from '@nestjs/common';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
} from '@elrondnetwork/erdjs';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig, gasConfig, cacheConfig } from '../../config';
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

@Injectable()
export class DistributionService {
    private readonly proxy: ProxyProvider;
    private readonly CacheDistributionKeys = {
        distributedTokenID: () => 'distributedTokenID',
        lockedTokenID: () => 'lockedTokenID',
        wrappedLpTokenID: () => 'wrappedLpTokenID',
        wrappedFarmTokenID: () => 'wrappedFarmTokenID',
        acceptedLockedTokensID: () => 'acceptedLockedTokensID',
        intermediatedPairsAddresses: () => 'intermediatedPairsAddresses',
        intermediatedFarmsAddresses: () => 'intermediatedFarmsAddresses',
        epoch: () => 'epoch',
        amount: () => 'amount',
        milestones: () => 'milestones',
    };

    constructor(
        private cacheManagerService: CacheManagerService,
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
        let cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.distributedTokenID(),
        );
        if (!!cachedData) {
            const distributedTokenID = cachedData.distributedTokenID;
            cachedData = await this.cacheManagerService.getToken(
                distributedTokenID,
            );

            if (!!cachedData) {
                return cachedData.token;
            }

            const distributedToken = await this.context.getTokenMetadata(
                distributedTokenID,
            );
            this.cacheManagerService.setToken(distributedTokenID, {
                token: distributedToken,
            });
            return distributedToken;
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

        this.cacheManagerService.set(
            this.CacheDistributionKeys.distributedTokenID(),
            { distributedTokenID: distributedTokenID },
            cacheConfig.default,
        );

        const distributedToken = await this.context.getTokenMetadata(
            result.firstValue.valueOf(),
        );

        this.cacheManagerService.setToken(distributedTokenID, {
            token: distributedToken,
        });

        return distributedToken;
    }

    async getLockedToken(): Promise<TokenModel> {
        let cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.lockedTokenID(),
        );
        if (!!cachedData) {
            const lockedTokenID = cachedData.lockedTokenID;
            cachedData = await this.cacheManagerService.getToken(lockedTokenID);

            if (!!cachedData) {
                return cachedData.token;
            }

            const lockedToken = await this.context.getTokenMetadata(
                lockedTokenID,
            );
            this.cacheManagerService.setToken(lockedTokenID, {
                token: lockedToken,
            });
            return lockedToken;
        }

        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getLockedTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const lockedTokenID = result.firstValue.valueOf();
        this.cacheManagerService.set(
            this.CacheDistributionKeys.lockedTokenID(),
            { lockedTokenID: lockedTokenID },
            cacheConfig.default,
        );

        const lockedToken = await this.context.getTokenMetadata(lockedTokenID);

        this.cacheManagerService.setToken(lockedTokenID, {
            token: lockedToken,
        });

        return lockedToken;
    }

    async getwrappedLpToken(): Promise<TokenModel> {
        let cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.wrappedLpTokenID(),
        );
        if (!!cachedData) {
            const wrappedLpTokenID = cachedData.wrappedLpTokenID;
            cachedData = await this.cacheManagerService.getToken(
                wrappedLpTokenID,
            );

            if (!!cachedData) {
                return cachedData.token;
            }

            const wrappedLpToken = await this.context.getTokenMetadata(
                wrappedLpTokenID,
            );
            this.cacheManagerService.setToken(wrappedLpTokenID, {
                token: wrappedLpToken,
            });
            return wrappedLpToken;
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
        this.cacheManagerService.set(
            this.CacheDistributionKeys.wrappedLpTokenID(),
            { wrappedLpTokenID: wrappedLpTokenID },
            cacheConfig.default,
        );
        const wrappedLpToken = await this.context.getTokenMetadata(
            wrappedLpTokenID,
        );
        this.cacheManagerService.setToken(wrappedLpTokenID, {
            token: wrappedLpToken,
        });

        return wrappedLpToken;
    }

    async getwrappedFarmToken(): Promise<TokenModel> {
        let cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.wrappedFarmTokenID(),
        );
        if (!!cachedData) {
            const wrappedFarmTokenID = cachedData.wrappedFarmTokenID;
            cachedData = await this.cacheManagerService.getToken(
                wrappedFarmTokenID,
            );

            if (!!cachedData) {
                return cachedData.token;
            }

            const wrappedFarmToken = await this.context.getTokenMetadata(
                wrappedFarmTokenID,
            );
            this.cacheManagerService.setToken(wrappedFarmTokenID, {
                token: wrappedFarmToken,
            });
            return wrappedFarmToken;
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
        this.cacheManagerService.set(
            this.CacheDistributionKeys.wrappedFarmTokenID(),
            { wrappedFarmTokenID: wrappedFarmTokenID },
            cacheConfig.default,
        );

        const wrappedFarmToken = await this.context.getTokenMetadata(
            wrappedFarmTokenID,
        );
        this.cacheManagerService.setToken(wrappedFarmTokenID, {
            token: wrappedFarmToken,
        });
        return wrappedFarmToken;
    }

    async getAcceptedLockedAssetsTokens(): Promise<TokenModel[]> {
        let cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.acceptedLockedTokensID(),
        );
        if (!!cachedData) {
            const acceptedLockedTokensID = cachedData.acceptedLockedTokensID;
            const acceptedLockedTokens: TokenModel[] = [];

            for (const rawTokenID of acceptedLockedTokensID) {
                const tokenID = rawTokenID.valueOf();
                cachedData = await this.cacheManagerService.getToken(tokenID);
                if (!!cachedData) {
                    acceptedLockedTokens.push(cachedData.token);
                } else {
                    const token = await this.context.getTokenMetadata(tokenID);
                    this.cacheManagerService.setToken(tokenID, {
                        token: token,
                    });
                    acceptedLockedTokens.push(token);
                }
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
        this.cacheManagerService.set(
            this.CacheDistributionKeys.acceptedLockedTokensID(),
            { acceptedLockedTokensID: response.values },
            cacheConfig.default,
        );

        const acceptedLockedTokens: TokenModel[] = [];
        for (const rawTokenID of response.values) {
            const tokenID = rawTokenID.valueOf();
            const token = await this.context.getTokenMetadata(tokenID);
            this.cacheManagerService.setToken(tokenID, { token: token });
            acceptedLockedTokens.push(token);
        }
        return acceptedLockedTokens;
    }

    async getDistributionMilestones(): Promise<DistributionMilestoneModel[]> {
        const cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.milestones(),
        );
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

        this.cacheManagerService.set(
            this.CacheDistributionKeys.milestones(),
            { milestones: milestones },
            cacheConfig.default,
        );

        return milestones;
    }

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const cachedEpoch = await this.cacheManagerService.get(
            this.CacheDistributionKeys.epoch(),
        );
        const cachedAmount = await this.cacheManagerService.get(
            this.CacheDistributionKeys.amount(),
        );
        const cachedMilestones = await this.cacheManagerService.get(
            this.CacheDistributionKeys.milestones(),
        );

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

        this.cacheManagerService.set(
            this.CacheDistributionKeys.epoch(),
            { epoch: epoch },
            cacheConfig.default,
        );
        this.cacheManagerService.set(
            this.CacheDistributionKeys.amount(),
            { amount: amount },
            cacheConfig.default,
        );

        return {
            epoch: epoch,
            amount: amount,
            milestones: milestones,
        };
    }

    async getIntermediatedPairs(): Promise<string[]> {
        const cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.intermediatedPairsAddresses(),
        );
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

        this.cacheManagerService.set(
            this.CacheDistributionKeys.intermediatedPairsAddresses(),
            { pairs: pairs },
            cacheConfig.default,
        );

        return pairs;
    }

    async getIntermediatedFarms(): Promise<string[]> {
        const cachedData = await this.cacheManagerService.get(
            this.CacheDistributionKeys.intermediatedFarmsAddresses(),
        );
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

        this.cacheManagerService.set(
            this.CacheDistributionKeys.intermediatedFarmsAddresses(),
            { farms: farms },
            cacheConfig.default,
        );

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

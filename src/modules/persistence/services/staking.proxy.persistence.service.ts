import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import {
    MongoCollections,
    MongoQueries,
    PersistenceMetrics,
} from 'src/helpers/decorators/persistence.metrics.decorator';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { Logger } from 'winston';
import { StakingProxyRepository } from '../repositories/staking.proxy.repository';
import { StakingProxyDocument } from '../schemas/staking.proxy.schema';
import { StakingFarmPersistenceService } from './staking.farm.persistence.service';
import { TokenPersistenceService } from './token.persistence.service';

@Injectable()
export class StakingProxyPersistenceService {
    constructor(
        private readonly stakingProxyRepository: StakingProxyRepository,
        private readonly remoteConfigGetter: RemoteConfigGetterService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly stakingFarmPersistence: StakingFarmPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @PersistenceMetrics(MongoCollections.StakingProxy, MongoQueries.Upsert)
    async upsertStakingProxy(
        stakingProxy: StakingProxyModel,
        projection: ProjectionType<StakingProxyModel> = { __v: 0 },
    ): Promise<StakingProxyDocument> {
        try {
            return this.stakingProxyRepository
                .getModel()
                .findOneAndUpdate(
                    { address: stakingProxy.address },
                    stakingProxy,
                    {
                        new: true,
                        upsert: true,
                        projection,
                    },
                );
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    @PersistenceMetrics(MongoCollections.StakingProxy, MongoQueries.Find)
    async getStakingProxies(
        filterQuery: FilterQuery<StakingProxyDocument>,
        projection?: ProjectionType<StakingProxyDocument>,
        populateOptions?: PopulateOptions[],
    ): Promise<StakingProxyDocument[]> {
        const farms = await this.stakingProxyRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();

        if (populateOptions) {
            await this.stakingProxyRepository
                .getModel()
                .populate(farms, populateOptions);
        }

        return farms;
    }

    async populateStakingProxies(): Promise<void> {
        this.logger.info(`Starting ${this.populateStakingProxies.name}`, {
            context: StakingProxyPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const addresses =
            await this.remoteConfigGetter.getStakingProxyAddresses();

        for (const address of addresses) {
            try {
                await this.populateStakingProxyModel(address);
            } catch (error) {
                this.logger.error(error, {
                    context: StakingProxyPersistenceService.name,
                    stakingProxyAddress: address,
                });
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.populateStakingProxies.name} : ${profiler.duration}ms`,
            {
                context: StakingProxyPersistenceService.name,
            },
        );
    }

    async populateStakingProxyModel(address: string): Promise<void> {
        const [
            lpFarmAddress,
            stakingFarmAddress,
            pairAddress,
            stakingTokenID,
            farmTokenCollection,
            dualYieldTokenCollection,
            lpFarmTokenCollection,
        ] = await Promise.all([
            this.stakingProxyAbi.getlpFarmAddressRaw(address),
            this.stakingProxyAbi.getStakingFarmAddressRaw(address),
            this.stakingProxyAbi.getPairAddressRaw(address),
            this.stakingProxyAbi.getStakingTokenIDRaw(address),
            this.stakingProxyAbi.getFarmTokenIDRaw(address),
            this.stakingProxyAbi.getDualYieldTokenIDRaw(address),
            this.stakingProxyAbi.getLpFarmTokenIDRaw(address),
        ]);

        const [[stakingToken], [stakingFarm]] = await Promise.all([
            this.tokenPersistence.getTokens(
                { identifier: stakingTokenID },
                { _id: 1, identifier: 1 },
            ),
            this.stakingFarmPersistence.getStakingFarms(
                {
                    address: stakingFarmAddress,
                },
                { minUnboundEpochs: 1 },
            ),
        ]);

        if (stakingToken === undefined || stakingFarm === undefined) {
            throw new Error(
                `Could not get staking token (${stakingTokenID}) or staking farm (${stakingFarmAddress}) for staking proxy ${address}`,
            );
        }

        const rawStakingProxy: Partial<StakingProxyModel> = {
            address,
            lpFarmAddress,
            stakingFarmAddress,
            pairAddress,
            stakingMinUnboundEpochs: stakingFarm.minUnboundEpochs,
            stakingToken: stakingToken._id,
            stakingTokenID,
            farmTokenCollection,
            dualYieldTokenCollection,
            lpFarmTokenCollection,
        };

        await this.upsertStakingProxy(rawStakingProxy as StakingProxyModel);
    }
}

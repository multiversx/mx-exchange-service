import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import moment from 'moment';
import { Model, UpdateWriteOpResult } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import {
    StateSnapshot,
    StateSnapshotDocument,
} from '../entities/state.snapshot.schema';

export interface SnapshotData {
    pairs: Map<string, PairModel>;
    tokens: Map<string, EsdtToken>;
    farms: Map<string, FarmModelV2>;
    stakingFarms: Map<string, StakingModel>;
    stakingProxies: Map<string, StakingProxyModel>;
    feesCollector: FeesCollectorModel;
}

@Injectable()
export class StateSnapshotService {
    constructor(
        @InjectModel(StateSnapshot.name)
        private readonly snapshotModel: Model<StateSnapshotDocument>,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getLatestSnapshot(): Promise<SnapshotData> {
        const pairs = new Map<string, PairModel>();
        const tokens = new Map<string, EsdtToken>();
        const farms = new Map<string, FarmModelV2>();
        const stakingFarms = new Map<string, StakingModel>();
        const stakingProxies = new Map<string, StakingProxyModel>();

        const snapshot = await this.snapshotModel
            .findOne({}, undefined, { lean: true })
            .sort({ date: 'desc' })
            .exec();

        if (snapshot?.pairs.length > 0) {
            snapshot.pairs.forEach((pair) => pairs.set(pair.address, pair));
        }

        if (snapshot?.tokens.length > 0) {
            snapshot.tokens.forEach((token) =>
                tokens.set(token.identifier, token),
            );
        }

        if (snapshot?.farms?.length > 0) {
            snapshot.farms.forEach((farm) => farms.set(farm.address, farm));
        }

        if (snapshot?.stakingFarms?.length > 0) {
            snapshot.stakingFarms.forEach((stakingFarm) =>
                stakingFarms.set(stakingFarm.address, stakingFarm),
            );
        }

        if (snapshot?.stakingProxies?.length > 0) {
            snapshot.stakingProxies.forEach((stakingProxy) =>
                stakingProxies.set(stakingProxy.address, stakingProxy),
            );
        }

        const feesCollector: FeesCollectorModel =
            snapshot?.feesCollector ?? undefined;

        return {
            pairs,
            tokens,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
        };
    }

    async updateSnapshot(
        pairs: PairModel[],
        tokens: EsdtToken[],
        farms: FarmModelV2[],
        stakingFarms: StakingModel[],
        stakingProxies: StakingProxyModel[],
        feesCollector: FeesCollectorModel,
    ): Promise<UpdateWriteOpResult> {
        const date = moment().utc().startOf('day').toDate();
        const blockNonce = await this.contextGetter.getShardCurrentBlockNonce(
            1,
        );

        try {
            const result = await this.snapshotModel
                .updateOne(
                    {
                        date,
                        $or: [
                            { blockNonce: { $lte: blockNonce } },
                            { blockNonce: { $exists: false } },
                        ],
                    },
                    {
                        $set: {
                            pairs,
                            tokens,
                            farms,
                            stakingFarms,
                            stakingProxies,
                            feesCollector,
                            blockNonce,
                        },
                    },
                    {
                        upsert: true,
                    },
                )
                .exec();

            return result;
        } catch (error) {
            if (error.name === MongoServerError.name && error.code === 11000) {
                this.logger.warn('Duplicate snapshot', {
                    context: StateSnapshotService.name,
                    date,
                    blockNonce,
                });

                return {
                    acknowledged: true,
                    matchedCount: 0,
                    modifiedCount: 0,
                    upsertedCount: 0,
                    upsertedId: null,
                };
            } else {
                throw error;
            }
        }
    }
}

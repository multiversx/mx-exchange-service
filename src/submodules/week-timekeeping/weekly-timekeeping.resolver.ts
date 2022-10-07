import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { NftCollection } from "../../modules/tokens/models/nftCollection.model";
import { ApolloError } from "apollo-server-express";
import {
    WeeklyRewardsSplittingModel
} from "../weekly-rewards-splitting/models/weekly-rewards-splitting.model";

import { WeekForEpochModel, WeeklyTimekeepingModel } from "./models/weekly-timekeeping.model";
import { WeeklyTimekeepingService } from "./services/weekly-timekeeping.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";
import { WeekTimekeepingComputerService } from "./services/week-timekeeping.computer.service";
import { genericFieldResover } from "../../utils/resolver";


@Resolver(() => WeeklyRewardsSplittingModel)
export class WeeklyTimekeepingResolver {
    constructor(
        protected readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
        protected readonly computerService: WeekTimekeepingComputerService,
        protected readonly weeklyTimekeepingService: WeeklyTimekeepingService,
    ) {}

    @ResolveField()
    async firstWeekStartEpoch(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weekTimekeepingGetterService.getFirstWeekStartEpoch(parent.scAddress),
        );
    }

    @ResolveField()
    async currentWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weekTimekeepingGetterService.getCurrentWeek(parent.scAddress),
        );
    }

    @ResolveField()
    async startEpochForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weekTimekeepingGetterService.getStartEpochForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async endEpochForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weekTimekeepingGetterService.getEndEpochForWeek(parent.scAddress, parent.week),
        );
    }

    @Query(() => WeeklyTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<WeeklyTimekeepingModel> {
        try {
            return this.weeklyTimekeepingService.getWeeklyTimekeeping(scAddress, week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async week(
        @Parent() parent: WeekForEpochModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.computerService.computeWeekForEpoch(parent.scAddress, parent.epoch),
        );
    }

    @Query(() => WeekForEpochModel)
    async weekForEpoch(
        @Args('scAddress') scAddress: string,
        @Args('epoch') epoch: number,
    ): Promise<WeekForEpochModel> {
        try {
            return this.weeklyTimekeepingService.getWeekForEpoch(scAddress, epoch);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}

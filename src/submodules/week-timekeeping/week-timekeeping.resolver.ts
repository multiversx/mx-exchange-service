import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    WeekForEpochModel,
    WeekTimekeepingModel,
} from './models/week-timekeeping.model';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { FeesCollectorGetterService } from 'src/modules/fees-collector/services/fees-collector.getter.service';
import { IWeekTimekeepingGetterService } from './interfaces';
import { scAddress } from 'src/config';
import { FarmGetterServiceV2 } from 'src/modules/farm/v2/services/farm.v2.getter.service';

@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver extends GenericResolver {
    constructor(
        private readonly farmGetterV2: FarmGetterServiceV2,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
    ) {
        super();
    }

    @ResolveField()
    async firstWeekStartEpoch(
        @Parent() parent: WeekTimekeepingModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.getterHandler(parent.scAddress).getFirstWeekStartEpoch(
                parent.scAddress,
            ),
        );
    }

    @ResolveField()
    async currentWeek(@Parent() parent: WeekTimekeepingModel): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.getterHandler(parent.scAddress).getCurrentWeek(
                parent.scAddress,
            ),
        );
    }

    @ResolveField()
    async startEpochForWeek(
        @Parent() parent: WeekTimekeepingModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.getterHandler(parent.scAddress).getStartEpochForWeek(
                parent.scAddress,
                parent.currentWeek,
            ),
        );
    }

    @ResolveField()
    async endEpochForWeek(
        @Parent() parent: WeekTimekeepingModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.getterHandler(parent.scAddress).getEndEpochForWeek(
                parent.scAddress,
                parent.currentWeek,
            ),
        );
    }

    @Query(() => WeekTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
    ): Promise<WeekTimekeepingModel> {
        return await this.genericQuery(async () => {
            const currentWeek = await this.getterHandler(
                scAddress,
            ).getCurrentWeek(scAddress);
            return new WeekTimekeepingModel({
                scAddress: scAddress,
                currentWeek: currentWeek,
            });
        });
    }

    @Query(() => WeekForEpochModel)
    async weekForEpoch(
        @Args('scAddress') scAddress: string,
        @Args('epoch') epoch: number,
    ): Promise<WeekForEpochModel> {
        return new WeekForEpochModel({
            scAddress: scAddress,
            epoch: epoch,
        });
    }

    private getterHandler(
        contractAddress: string,
    ): IWeekTimekeepingGetterService {
        if (scAddress.feesCollector === contractAddress) {
            return this.feesCollectorGetter;
        }
        return this.farmGetterV2;
    }
}

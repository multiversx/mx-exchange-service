import { DynamicModule, forwardRef, Module } from '@nestjs/common';
import { WeeklyRewardsSplittingGetterService } from './services/weekly-rewards-splitting.getter.service';
import { CachingModule } from '../../services/caching/cache.module';
import { WeeklyRewardsSplittingAbiService } from './services/weekly-rewards-splitting.abi.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WeeklyRewardsSplittingService } from './services/weekly-rewards-splitting.service';
import { ApiConfigService } from '../../helpers/api.config.service';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingModule } from '../week-timekeeping/week-timekeeping.module';
import { ProgressComputeService } from './services/progress.compute.service';
import {
    GlobalInfoByWeekResolver,
} from './weekly-rewards-splitting.resolver';
import { RouterModule } from '../../modules/router/router.module';
import { PairModule } from '../../modules/pair/pair.module';
import { TokenModule } from '../../modules/tokens/token.module';
import { EnergyModule } from 'src/modules/energy/energy.module';
import { FarmModuleV2 } from '../../modules/farm/v2/farm.v2.module';
import { ContextModule } from '../../services/context/context.module';
import { WeeklyRewardsSplittingSetterService } from './services/weekly-rewards-splitting.setter.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        EnergyModule,
        RouterModule,
        PairModule,
        TokenModule,
        forwardRef(() => FarmModuleV2),
        forwardRef(() => ContextModule),
    ],
})
export class WeeklyRewardsSplittingModule {
    static register(abiProvider: any, computeProvider?: any): DynamicModule {
        return {
            module: WeeklyRewardsSplittingModule,
            imports: [WeekTimekeepingModule.register(abiProvider)],
            providers: [
                ApiConfigService,
                ProgressComputeService,
                WeeklyRewardsSplittingService,
                {
                    provide: WeeklyRewardsSplittingAbiService,
                    useClass: abiProvider,
                },
                WeeklyRewardsSplittingGetterService,
                WeeklyRewardsSplittingSetterService,
                {
                    provide: WeeklyRewardsSplittingComputeService,
                    useClass:
                        computeProvider ?? WeeklyRewardsSplittingComputeService,
                },
                GlobalInfoByWeekResolver,
            ],
            exports: [
                ProgressComputeService,
                GlobalInfoByWeekResolver,
                WeeklyRewardsSplittingService,
                WeeklyRewardsSplittingGetterService,
                WeeklyRewardsSplittingSetterService,
                WeeklyRewardsSplittingAbiService,
                WeeklyRewardsSplittingComputeService,
            ],
        };
    }
}

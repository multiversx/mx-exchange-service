import { forwardRef, Module } from '@nestjs/common';
import { CachingModule } from '../../services/caching/cache.module';
import { WeeklyRewardsSplittingAbiService } from './services/weekly-rewards-splitting.abi.service';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { WeeklyRewardsSplittingService } from './services/weekly-rewards-splitting.service';
import { ApiConfigService } from '../../helpers/api.config.service';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingModule } from '../week-timekeeping/week-timekeeping.module';
import { ProgressComputeService } from './services/progress.compute.service';
import { GlobalInfoByWeekResolver } from './weekly-rewards-splitting.resolver';
import { RouterModule } from '../../modules/router/router.module';
import { PairModule } from '../../modules/pair/pair.module';
import { TokenModule } from '../../modules/tokens/token.module';
import { EnergyModule } from 'src/modules/energy/energy.module';
import { FarmModuleV2 } from '../../modules/farm/v2/farm.v2.module';
import { ContextModule } from '../../services/context/context.module';
import { FeesCollectorModule } from 'src/modules/fees-collector/fees-collector.module';

@Module({
    imports: [
        MXCommunicationModule,
        CachingModule,
        EnergyModule,
        forwardRef(() => RouterModule),
        PairModule,
        TokenModule,
        forwardRef(() => FarmModuleV2),
        forwardRef(() => FeesCollectorModule),
        forwardRef(() => ContextModule),
        forwardRef(() => WeekTimekeepingModule),
    ],
    providers: [
        ApiConfigService,
        ProgressComputeService,
        WeeklyRewardsSplittingService,
        WeeklyRewardsSplittingAbiService,
        WeeklyRewardsSplittingComputeService,
        GlobalInfoByWeekResolver,
    ],
    exports: [
        ProgressComputeService,
        GlobalInfoByWeekResolver,
        WeeklyRewardsSplittingService,
        WeeklyRewardsSplittingAbiService,
        WeeklyRewardsSplittingComputeService,
    ],
})
export class WeeklyRewardsSplittingModule {}

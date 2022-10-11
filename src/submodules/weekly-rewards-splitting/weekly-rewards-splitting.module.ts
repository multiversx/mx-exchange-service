import { DynamicModule, Module } from '@nestjs/common';
import { WeeklyRewardsSplittingResolver } from './weekly-rewards-splitting.resolver';
import { WeeklyRewardsSplittingGetterService } from './services/weekly-rewards.splitting.getter.service';
import { CachingModule } from '../../services/caching/cache.module';
import { WeeklyRewardsSplittingAbiService } from './services/weekly-rewards-splitting.abi.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WeeklyRewardsSplittingService } from './services/weekly-rewards-splitting.service';
import { ApiConfigService } from '../../helpers/api.config.service';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards.splitting.compute.service';
import { WeekTimekeepingModule } from '../week-timekeeping/week-timekeeping.module';
import { ProgressComputeService } from './services/progress.compute.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
    ]
})
export class WeeklyRewardsSplittingModule {
    static register(abiProvider: any): DynamicModule {
        return {
            module: WeeklyRewardsSplittingModule,
            imports: [
                WeekTimekeepingModule.register(abiProvider),
            ],
            providers: [
                ApiConfigService,
                ProgressComputeService,
                WeeklyRewardsSplittingService,
                {
                    provide: WeeklyRewardsSplittingAbiService,
                    useClass: abiProvider,
                },
                WeeklyRewardsSplittingGetterService,
                WeeklyRewardsSplittingComputeService,
                WeeklyRewardsSplittingResolver,
            ],
            exports: [
                WeeklyRewardsSplittingResolver,
                WeeklyRewardsSplittingService,
                WeeklyRewardsSplittingAbiService,
            ],

        }
    }
}

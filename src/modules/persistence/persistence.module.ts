import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingModule } from 'src/submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EnergyModule } from '../energy/energy.module';
import { FarmModelV2 } from '../farm/models/farm.v2.model';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { PairModel } from '../pair/models/pair.model';
import { PairModule } from '../pair/pair.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { RouterModule } from '../router/router.module';
import { StakingModel } from '../staking/models/staking.model';
import { StakingModule } from '../staking/staking.module';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { TokenModule } from '../tokens/token.module';
import { FarmRepository } from './repositories/farm.repository';
import { GlobalInfoRepository } from './repositories/global.info.repository';
import { PairRepository } from './repositories/pair.repository';
import { StakingFarmRepository } from './repositories/staking.farm.repository';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { FarmSchema } from './schemas/farm.schema';
import { GlobalInfoSchema } from './schemas/global.info.schema';
import { PairSchema } from './schemas/pair.schema';
import { StakingFarmSchema } from './schemas/staking.farm.schema';
import { FarmPersistenceService } from './services/farm.persistence.service';
import { GlobalInfoPersistenceService } from './services/global.info.persistence.service';
import { PairPersistenceService } from './services/pair.persistence.service';
import { PersistenceService } from './services/persistence.service';
import { StakingFarmPersistenceService } from './services/staking.farm.persistence.service';
import { TokenPersistenceService } from './services/token.persistence.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
            { name: PairModel.name, schema: PairSchema },
            { name: FarmModelV2.name, schema: FarmSchema },
            { name: GlobalInfoByWeekModel.name, schema: GlobalInfoSchema },
            { name: StakingModel.name, schema: StakingFarmSchema },
        ]),
        forwardRef(() => RouterModule),
        TokenModule,
        PairModule,
        MXCommunicationModule,
        AnalyticsModule,
        DynamicModuleUtils.getCommonRedisModule(),
        DynamicModuleUtils.getRedlockModule(),
        DynamicModuleUtils.getCacheModule(),
        FarmModuleV2,
        WeekTimekeepingModule,
        WeeklyRewardsSplittingModule,
        EnergyModule,
        StakingModule,
        RemoteConfigModule,
    ],
    providers: [
        TokenRepository,
        TokenPersistenceService,
        PairRepository,
        PairPersistenceService,
        FarmRepository,
        FarmPersistenceService,
        GlobalInfoPersistenceService,
        GlobalInfoRepository,
        StakingFarmRepository,
        StakingFarmPersistenceService,
        PersistenceService,
    ],
    exports: [
        PersistenceService,
        TokenPersistenceService,
        PairPersistenceService,
    ],
    controllers: [],
})
export class PersistenceModule {}

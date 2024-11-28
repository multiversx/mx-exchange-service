import { Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MemoryStoreCronService } from './services/memory.store.cron.service';
import { StakingProxyModule } from '../staking-proxy/staking.proxy.module';
import { EnergyModule } from '../energy/energy.module';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { StakingModule } from '../staking/staking.module';
import { TokenModule } from '../tokens/token.module';
import { FarmModule } from '../farm/farm.module';

@Module({
    imports: [
        EnergyModule,
        FarmModule,
        FarmModuleV2,
        PairModule,
        RouterModule,
        StakingModule,
        StakingProxyModule,
        ScheduleModule.forRoot(),
        TokenModule,
    ],
    providers: [MemoryStoreCronService],
    exports: [],
})
export class MemoryStoreCronModule {}

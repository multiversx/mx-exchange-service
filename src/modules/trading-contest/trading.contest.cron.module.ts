import { Module } from '@nestjs/common';
import { TradingContestCronService } from './services/trading.contest.cron';
import { TradingContestModule } from './trading.contest.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [TradingContestModule, DynamicModuleUtils.getRedlockModule()],
    providers: [TradingContestCronService],
})
export class TradingContestCronModule {}

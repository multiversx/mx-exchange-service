import { Module } from '@nestjs/common';
import { SmartRouterEvaluationCronService } from './services/smart.router.evaluation.cron';
import { SmartRouterEvaluationModule } from './smart.router.evaluation.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [
        SmartRouterEvaluationModule,
        ElasticSearchModule,
        DynamicModuleUtils.getRedlockModule(),
        DynamicModuleUtils.getCommonRedisModule(),
    ],
    providers: [SmartRouterEvaluationCronService],
})
export class SmartRouterEvaluationCronModule {}

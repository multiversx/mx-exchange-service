import { Module } from '@nestjs/common';
import { SmartRouterEvaluationCronService } from './services/smart.router.evaluation.cron';
import { SmartRouterEvaluationModule } from './smart.router.evaluation.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

@Module({
    imports: [SmartRouterEvaluationModule, ElasticSearchModule],
    providers: [SmartRouterEvaluationCronService],
})
export class SmartRouterEvaluationCronModule {}

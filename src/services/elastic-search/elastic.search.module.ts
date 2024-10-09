import { Module } from '@nestjs/common';
import { ESTransactionsService } from './services/es.transactions.service';
import { ESLogsService } from './services/es.logs.service';
import { CommonAppModule } from 'src/common.app.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ElasticSearchEventsService } from './services/es.events.service';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getApiModule(),
        DynamicModuleUtils.getElasticModule(),
    ],
    providers: [
        ESTransactionsService,
        ESLogsService,
        ElasticSearchEventsService,
    ],
    exports: [ESTransactionsService, ESLogsService, ElasticSearchEventsService],
})
export class ElasticSearchModule {}

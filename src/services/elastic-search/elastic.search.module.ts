import { Module } from '@nestjs/common';
import { ESTransactionsService } from './services/es.transactions.service';
import { ESLogsService } from './services/es.logs.service';
import { CommonAppModule } from 'src/common.app.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getApiModule(),
        DynamicModuleUtils.getElasticModule(),
    ],
    providers: [ESTransactionsService, ESLogsService],
    exports: [ESTransactionsService, ESLogsService],
})
export class ElasticSearchModule {}

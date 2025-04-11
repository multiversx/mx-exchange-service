import { Module } from '@nestjs/common';
import { ESTransactionsService } from './services/es.transactions.service';
import { CommonAppModule } from 'src/common.app.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ElasticSearchEventsService } from './services/es.events.service';
import { ESBlocksService } from './services/es.blocks.service';
import { ESOperationsService } from './services/es.operations.service';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getApiModule(),
        DynamicModuleUtils.getElasticModule(),
    ],
    providers: [
        ESTransactionsService,
        ElasticSearchEventsService,
        ESBlocksService,
        ESOperationsService,
    ],
    exports: [
        ESTransactionsService,
        ElasticSearchEventsService,
        ESBlocksService,
        ESOperationsService,
    ],
})
export class ElasticSearchModule {}

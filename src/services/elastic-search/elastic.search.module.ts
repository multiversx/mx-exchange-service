import { Module } from '@nestjs/common';
import { ESTransactionsService } from './services/es.transactions.service';
import { CommonAppModule } from 'src/common.app.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ElasticSearchEventsService } from './services/es.events.service';
import { ESOperationsService } from './services/es.operations.service';
import { ElasticAccountsEnergyService } from './services/es.accounts.energy.service';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getApiModule(),
        DynamicModuleUtils.getElasticModule(),
    ],
    providers: [
        ESTransactionsService,
        ElasticSearchEventsService,
        ESOperationsService,
        ElasticAccountsEnergyService,
    ],
    exports: [
        ESTransactionsService,
        ElasticSearchEventsService,
        ESOperationsService,
        ElasticAccountsEnergyService,
    ],
})
export class ElasticSearchModule {}

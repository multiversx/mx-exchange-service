import { Module } from '@nestjs/common';
import { ESTransactionsService } from './services/es.transactions.service';
import { ESLogsService } from './services/es.logs.service';
import { CommonAppModule } from 'src/common.app.module';
import { ElasticService } from 'src/helpers/elastic.service';

@Module({
    imports: [CommonAppModule],
    providers: [ElasticService, ESTransactionsService, ESLogsService],
    exports: [ESTransactionsService, ESLogsService],
})
export class ElasticSearchModule {}

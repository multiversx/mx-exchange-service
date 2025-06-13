import { Module } from '@nestjs/common';
import { ElasticAccountsEnergyService } from './services/es.accounts.energy.service';
import { CommonAppModule } from 'src/common.app.module';
import { ApiService } from '@multiversx/sdk-nestjs-http';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ElasticModuleOptions, ElasticService } from '@multiversx/sdk-nestjs-elastic';
import { MetricsService } from '@multiversx/sdk-nestjs-monitoring';

@Module({
    imports: [CommonAppModule],
    providers: [
      {
        provide: 'ACCOUNTS_ELASTIC_SERVICE',
        useFactory: (
          configService: ApiConfigService,
          apiService: ApiService,
          metricsService: MetricsService,
        ) => {
          const options = new ElasticModuleOptions({
            url: configService.getAccountsElasticSearchUrl(),
          });
  
          return new ElasticService(options, apiService, metricsService);
        },
        inject: [ApiConfigService, ApiService, MetricsService],
      },
      ElasticAccountsEnergyService,
    ],
    exports: ['ACCOUNTS_ELASTIC_SERVICE', ElasticAccountsEnergyService],
  })
export class AccountsElasticSearchModule {}

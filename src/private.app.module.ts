import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { PairModule } from './modules/pair/pair.module';
import { RemoteConfigController } from './modules/remote-config/remote-config.controller';
import { RemoteConfigModule } from './modules/remote-config/remote-config.module';
import { TokenController } from './modules/tokens/token.controller';
import { TokenModule } from './modules/tokens/token.module';
import { DynamicModuleUtils } from './utils/dynamic.module.utils';
import { ESTransactionsService } from './services/elastic-search/services/es.transactions.service';
import { SmartRouterEvaluationModule } from './modules/smart-router-evaluation/smart.router.evaluation.module';
import { SmartRouterEvaluationController } from './modules/smart-router-evaluation/smart.router.evaluation.controller';
import { PushNotificationsController } from './modules/push-notifications/push.notifications.controller';
import { XPortalApiService } from './services/multiversx-communication/mx.xportal.api.service';
import { PushNotificationsModule } from './modules/push-notifications/push.notifications.module';

@Module({
    imports: [
        CommonAppModule,
        PairModule,
        TokenModule,
        RemoteConfigModule,
        DynamicModuleUtils.getCacheModule(),
        DynamicModuleUtils.getCommonRedisModule(),
        SmartRouterEvaluationModule,
        PushNotificationsModule,
    ],
    controllers: [
        MetricsController,
        TokenController,
        RemoteConfigController,
        SmartRouterEvaluationController,
        PushNotificationsController
    ],
    providers: [ESTransactionsService, XPortalApiService],
})
export class PrivateAppModule {}

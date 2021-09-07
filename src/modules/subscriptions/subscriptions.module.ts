import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { SubscriptionsResolver } from './subscriptions.resolver';

@Module({
    imports: [CommonAppModule, ContextModule],
    providers: [SubscriptionsResolver],
    exports: [],
})
export class SubscriptionsModule {}

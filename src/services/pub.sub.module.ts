import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CacheController } from '../endpoints/cache/cache.controller';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [CommonAppModule, DynamicModuleUtils.getCacheModule()],
    controllers: [CacheController],
    providers: [],
})
export class PubSubModule {}

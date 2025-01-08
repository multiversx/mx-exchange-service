import { Module } from '@nestjs/common';
import { MemoryStoreController } from './memory.store.controller';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [DynamicModuleUtils.getRedisCacheModule()],
    providers: [],
    exports: [],
    controllers: [MemoryStoreController],
})
export class MemoryStoreCacheModule {}

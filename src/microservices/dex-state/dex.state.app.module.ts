import { Module } from '@nestjs/common';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { DexStateController } from './dex.state.controller';
import { DexStateService } from './services/dex.state.service';

@Module({
    imports: [DynamicModuleUtils.getCacheModule()],
    providers: [DexStateService],
    controllers: [DexStateController],
})
export class DexStateAppModule {}

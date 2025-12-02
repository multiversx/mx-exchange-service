import { Module } from '@nestjs/common';
import { DexStateController } from './dex.state.controller';
import { DexStateService } from './services/dex.state.service';

@Module({
    imports: [],
    providers: [DexStateService],
    controllers: [DexStateController],
})
export class DexStateAppModule {}

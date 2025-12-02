import { Module } from '@nestjs/common';
import { DexStateClientModule } from 'src/microservices/dex-state/dex.state.client.module';
import { PairsStateService } from './services/pairs.state.service';
import { TokensStateService } from './services/tokens.state.service';

@Module({
    imports: [DexStateClientModule],
    providers: [TokensStateService, PairsStateService],
    exports: [TokensStateService, PairsStateService],
})
export class DexStateModule {}

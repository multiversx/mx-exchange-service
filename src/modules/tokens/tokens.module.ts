import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { TokenService } from './services/tokens.service';

@Module({
    imports: [ElrondCommunicationModule, RouterModule, PairModule],
    providers: [TokenService],
})
export class TokensModule {}

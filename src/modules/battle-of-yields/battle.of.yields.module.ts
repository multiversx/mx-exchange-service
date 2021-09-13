import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { UserModule } from '../user/user.module';
import { BattleOfYieldsResolver } from './battle.of.yields.resolver';
import { BattleOfYieldsService } from './battle.of.yields.service';

@Module({
    imports: [ElrondCommunicationModule, CachingModule, UserModule],
    providers: [BattleOfYieldsService, BattleOfYieldsResolver],
    exports: [BattleOfYieldsService],
})
export class BattleOfYieldsModule {}

import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { UserModule } from '../user/user.module';
import { BattleOfYieldsResolver } from './battle.of.yields.resolver';
import { BattleOfYieldsService } from './battle.of.yields.service';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        ContextModule,
        CachingModule,
        UserModule,
    ],
    providers: [BattleOfYieldsService, BattleOfYieldsResolver],
    exports: [BattleOfYieldsService],
})
export class BattleOfYieldsModule {}

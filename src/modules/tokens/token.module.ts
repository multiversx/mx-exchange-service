import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtTokenDbModel, EsdtTokenSchema } from './schemas/token.schema';
import { TokenRepositoryService } from './services/token.repository.service';
import { TokenGetterService } from './services/token.getter.service';
import { TokenService } from './services/token.service';
import { TokensResolver } from './token.resolver';
import { DatabaseModule } from 'src/services/database/database.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        RouterModule,
        PairModule,
        DatabaseModule,
        MongooseModule.forFeature([
            { name: EsdtTokenDbModel.name, schema: EsdtTokenSchema },
        ]),
    ],
    providers: [
        TokenService,
        TokenGetterService,
        TokenRepositoryService,
        TokensResolver,
    ],
    exports: [TokenRepositoryService],
})
export class TokenModule {}

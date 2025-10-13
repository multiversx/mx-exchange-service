import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PairModel } from '../pair/models/pair.model';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { TokenModule } from '../tokens/token.module';
import { PairRepository } from './repositories/pair.repository';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { PairSchema } from './schemas/pair.schema';
import { PairPersistenceService } from './services/pair.persistence.service';
import { TokenPersistenceService } from './services/token.persistence.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
            { name: PairModel.name, schema: PairSchema },
        ]),
        forwardRef(() => RouterModule),
        TokenModule,
        PairModule,
    ],
    providers: [
        TokenRepository,
        TokenPersistenceService,
        PairRepository,
        PairPersistenceService,
    ],
    exports: [TokenPersistenceService, PairPersistenceService],
    controllers: [],
})
export class PersistenceModule {}

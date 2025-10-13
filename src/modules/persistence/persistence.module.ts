import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PairModel } from '../pair/models/pair.model';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { PairRepository } from './repositories/pair.repository';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { PairSchema } from './schemas/pair.schema';
import { TokenPersistenceService } from './services/token.persistence.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
            { name: PairModel.name, schema: PairSchema },
        ]),
    ],
    providers: [TokenRepository, TokenPersistenceService, PairRepository],
    exports: [TokenPersistenceService],
    controllers: [],
})
export class PersistenceModule {}

import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsdtToken } from '../models/esdtToken.model';
import { TokenRepository } from './services/token.repository';
import { TokenPersistenceService } from './services/token.persistence.service';
import { TokenModule } from '../token.module';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { PairPersistenceModule } from 'src/modules/pair/persistence/pair.persistence.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
        ]),
        TokenModule,
        forwardRef(() => PairPersistenceModule),
    ],
    providers: [TokenRepository, TokenPersistenceService],
    exports: [TokenPersistenceService],
})
export class TokenPersistenceModule {}

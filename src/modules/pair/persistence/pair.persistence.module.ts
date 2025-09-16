import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouterModule } from 'src/modules/router/router.module';
import { TokenPersistenceModule } from 'src/modules/tokens/persistence/token.persistence.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModel } from '../models/pair.model';
import { PairModule } from '../pair.module';
import { PairSchema } from './schemas/pair.schema';
import { PairPersistenceService } from './services/pair.persistence.service';
import { PairRepository } from './services/pair.repository';

@Module({
    imports: [
        MXCommunicationModule,
        MongooseModule.forFeature([
            { name: PairModel.name, schema: PairSchema },
        ]),
        PairModule,
        RouterModule,
        forwardRef(() => TokenPersistenceModule),
    ],
    providers: [PairRepository, PairPersistenceService],
    exports: [PairPersistenceService],
})
export class PairPersistenceModule {}

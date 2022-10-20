import { Module } from '@nestjs/common';
import { FarmService } from './services/farm.service';
import { FarmResolver } from './resolvers/farm.resolver';
import { AbiFarmService } from './services/farm.abi.service';
import { TransactionsFarmService } from './services/farm.transaction.service';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { FarmGetterService } from './services/farm.getter.service';
import { FarmComputeService } from './services/farm.compute.service';
import { FarmSetterService } from './services/farm.setter.service';
import { CommonAppModule } from 'src/common.app.module';
import { TokenModule } from '../tokens/token.module';
import { FarmV12AbiService } from './services/v1.2/farm.v1.2.abi.service';
import { FarmV12GetterService } from './services/v1.2/farm.v1.2.getter.service';
import { FarmV12ComputeService } from './services/v1.2/farm.v1.2.compute.service';
import { FarmV13AbiService } from './services/v1.3/farm.v1.3.abi.service';
import { FarmV13GetterService } from './services/v1.3/farm.v1.3.getter.service';
import { FarmV13ComputeService } from './services/v1.3/farm.v1.3.compute.service';
import { FarmCustomAbiService } from './services/custom/farm.custom.abi.service';
import { FarmCustomGetterService } from './services/custom/farm.custom.getter.service';
import { FarmV12Resolver } from './resolvers/farm.v1.2.resolver';
import { FarmV13Resolver } from './resolvers/farm.v1.3.resolver';
import { FarmCustomResolver } from './resolvers/farm.custom.resolver';
import { FarmQueryResolver } from './resolvers/farm.query.resolver';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        TokenModule,
    ],
    providers: [
        FarmService,
        AbiFarmService,
        FarmGetterService,
        FarmSetterService,
        FarmComputeService,
        TransactionsFarmService,
        FarmV12AbiService,
        FarmV12GetterService,
        FarmV12ComputeService,
        FarmV13AbiService,
        FarmV13GetterService,
        FarmV13ComputeService,
        FarmCustomAbiService,
        FarmCustomGetterService,
        FarmResolver,
        FarmV12Resolver,
        FarmV13Resolver,
        FarmCustomResolver,
        FarmQueryResolver,
    ],
    exports: [
        FarmService,
        AbiFarmService,
        FarmGetterService,
        FarmSetterService,
        FarmComputeService,
        FarmV12AbiService,
        FarmV13AbiService,
        FarmV12ComputeService,
        FarmV13ComputeService,
    ],
})
export class FarmModule {}

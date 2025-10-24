import { Module } from '@nestjs/common';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { PersistenceModule } from './persistence.module';
import { PersistenceCronService } from './services/persistence.cron';

@Module({
    imports: [PersistenceModule, DynamicModuleUtils.getRedlockModule()],
    providers: [PersistenceCronService],
    exports: [],
})
export class PersistenceCronModule {}

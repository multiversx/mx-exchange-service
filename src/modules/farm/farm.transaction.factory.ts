import { Injectable } from '@nestjs/common';
import { farmVersion } from 'src/utils/farm.utils';
import { TransactionsFarmService } from './base-module/services/farm.transaction.service';
import { FarmVersion } from './models/farm.model';
import { FarmTransactionServiceV1_2 } from './v1.2/services/farm.v1.2.transaction.service';
import { FarmTransactionServiceV1_3 } from './v1.3/services/farm.v1.3.transaction.service';
import { FarmTransactionServiceV2 } from './v2/services/farm.v2.transaction.service';

@Injectable()
export class FarmTransactionFactory {
    constructor(
        private readonly transactionsV1_2: FarmTransactionServiceV1_2,
        private readonly transactionsV1_3: FarmTransactionServiceV1_3,
        private readonly transactionsV2: FarmTransactionServiceV2,
    ) {}

    useTransaction(farmAddress: string): TransactionsFarmService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.transactionsV1_2;
            case FarmVersion.V1_3:
                return this.transactionsV1_3;
            case FarmVersion.V2:
                return this.transactionsV2;
        }
    }
}

import { QueryType, ElasticService } from '@multiversx/sdk-nestjs-elastic';
import { ElasticQuery } from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class ElasticAccountsEnergyService {
    constructor(
        @Inject('ACCOUNTS_ELASTIC_SERVICE')
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getAccountsByEnergyField(
        epoch: number,
        field: 'energyDetails.amount' | 'energyNum',
        operator: 'gt' | 'lt' | 'gte' | 'lte' = 'gt',
        action: (items: any[]) => Promise<void>,
        amount = 0,
    ): Promise<void> {
        try {
            const query = ElasticQuery.create()
                .withPagination({ from: 0, size: 10000 })
                .withMustExistCondition('energyDetails');

            query.condition.must = [
                QueryType.Range(field, {
                    key: operator,
                    value: amount,
                }),
            ];

            await this.elasticService.getScrollableList(
                `accounts-000001_${epoch}`,
                'address',
                query,
                action,
            );
        } catch (error) {
            this.logger.error(
                `Error getting accounts by energy field ${field}: ${error.message}`,
                { context: ElasticAccountsEnergyService.name },
            );
        }
    }
}
import { QueryType, ElasticService } from '@multiversx/sdk-nestjs-elastic';

import { ElasticQuery } from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ElasticAccountsEnergyService {
    constructor(
        @Inject('ACCOUNTS_ELASTIC_SERVICE')
        private readonly elasticService: ElasticService,
    ) {}

    async getAccountsByEnergyAmount(
        epoch: number,
        operator: 'gt' | 'lt' | 'gte' | 'lte' = 'gt',
        action: (items: any[]) => Promise<void>,
        amount = 0,
    ): Promise<void> {
        const query = ElasticQuery.create()
            .withPagination({ from: 0, size: 10000 })
            .withMustExistCondition('energyDetails');

        query.condition.must = [
            QueryType.Range('energyDetails.amount', {
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
    }
}

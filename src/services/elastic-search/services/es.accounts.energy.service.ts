import { OriginLogger } from '@multiversx/sdk-nestjs-common';
import { QueryType, ElasticService } from '@multiversx/sdk-nestjs-elastic';
import { ElasticQuery } from '@multiversx/sdk-nestjs-elastic';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ElasticAccountsEnergyService {
    private readonly logger = new OriginLogger(
        ElasticAccountsEnergyService.name,
    );

    constructor(private readonly elasticService: ElasticService) {}

    async getAccountsByEnergyAmount(
        epoch: number,
        operator: 'gt' | 'lt' | 'gte' | 'lte' = 'gt',
        action: (items: any[]) => Promise<void>,
        amount = 0,
    ): Promise<void> {
        try {
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
        } catch (error) {
            this.logger.error(
                `Error getting accounts by energy amount: ${error.message}`,
            );
        }
    }
}

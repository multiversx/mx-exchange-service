import {
    ElasticPagination,
    ElasticQuery,
    ElasticService,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { hexToString } from 'src/helpers/helpers';
import { SWAP_IDENTIFIER } from 'src/modules/rabbitmq/handlers/pair.swap.handler.service';
import { Logger } from 'winston';

@Injectable()
export class ElasticSearchEventsService {
    constructor(
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getPairSwapCount(
        address: string,
        start?: number,
        end?: number,
    ): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('address', address),
            QueryType.Should([
                QueryType.Match('identifier', SWAP_IDENTIFIER.SWAP_FIXED_INPUT),
                QueryType.Match(
                    'identifier',
                    SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
                ),
            ]),
        ];

        if (start && end) {
            elasticQueryAdapter.filter = [
                QueryType.Range(
                    'timestamp',
                    {
                        key: 'gte',
                        value: start,
                    },
                    {
                        key: 'lte',
                        value: end,
                    },
                ),
            ];
        }

        return await this.elasticService.getCount(
            'events',
            elasticQueryAdapter,
        );
    }

    async getTokenSwapsCount(
        startTimestamp: number,
        endTimestamp: number,
        pairAddresses: string[],
    ): Promise<Map<string, number>> {
        const tokensSwapCountMap: Map<string, number> = new Map();

        const processSwapEventsAction = async (
            events: any[],
        ): Promise<void> => {
            for (const event of events) {
                if (!pairAddresses.includes(event.address)) {
                    continue;
                }

                const firstTokenID = hexToString(event.topics[1]);
                const secondTokenID = hexToString(event.topics[2]);

                if (tokensSwapCountMap.has(firstTokenID)) {
                    tokensSwapCountMap.set(
                        firstTokenID,
                        tokensSwapCountMap.get(firstTokenID) + 1,
                    );
                } else {
                    tokensSwapCountMap.set(firstTokenID, 1);
                }

                if (tokensSwapCountMap.has(secondTokenID)) {
                    tokensSwapCountMap.set(
                        secondTokenID,
                        tokensSwapCountMap.get(secondTokenID) + 1,
                    );
                } else {
                    tokensSwapCountMap.set(secondTokenID, 1);
                }
            }
        };

        await this.getEvents(
            [
                SWAP_IDENTIFIER.SWAP_FIXED_INPUT,
                SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
            ],
            startTimestamp,
            endTimestamp,
            processSwapEventsAction,
            500,
        );

        return tokensSwapCountMap;
    }

    private async getEvents(
        eventIdentifiers: string[],
        startTimestamp: number,
        endTimestamp: number,
        action: (items: any[]) => Promise<void>,
        size = 100,
    ): Promise<void> {
        const pagination = new ElasticPagination();
        pagination.size = size;

        const elasticQueryAdapter: ElasticQuery =
            new ElasticQuery().withPagination(pagination);

        elasticQueryAdapter.withPagination;
        elasticQueryAdapter.condition.must = [
            QueryType.Should(
                eventIdentifiers.map((identifier) =>
                    QueryType.Match('identifier', identifier),
                ),
            ),
        ];

        elasticQueryAdapter.filter = [
            QueryType.Range(
                'timestamp',
                {
                    key: 'gte',
                    value: startTimestamp,
                },
                {
                    key: 'lte',
                    value: endTimestamp,
                },
            ),
        ];

        await this.elasticService.getScrollableList(
            'events',
            '',
            elasticQueryAdapter,
            action,
        );
    }
}

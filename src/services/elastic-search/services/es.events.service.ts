import {
    ElasticPagination,
    ElasticQuery,
    ElasticService,
    ElasticSortOrder,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SWAP_IDENTIFIER } from 'src/modules/rabbitmq/handlers/pair.swap.handler.service';
import { Logger } from 'winston';
import { RawElasticEventType } from '../entities/raw.elastic.event';
import { SwapEvent } from '@multiversx/sdk-exchange';
import { convertEventTopicsAndDataToBase64 } from 'src/utils/elastic.search.utils';
import { CustomTermsQuery } from '../entities/terms.query';

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
                const swapEvent = new SwapEvent(
                    convertEventTopicsAndDataToBase64(event),
                );

                const firstTokenID = swapEvent.getTokenIn().tokenID;
                const secondTokenID = swapEvent.getTokenOut().tokenID;

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

    async getGovernanceVotes(
        scAddress: string,
        callerAddressHex: string,
        proposalIdHex: string,
    ): Promise<RawElasticEventType[]> {
        const result: RawElasticEventType[] = [];
        const processEventsAction = async (events: any[]): Promise<void> => {
            result.push(...events);
        };

        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('address', scAddress),
            QueryType.Match('identifier', 'vote'),
            QueryType.Match('topics', proposalIdHex),
            QueryType.Match('topics', callerAddressHex),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        await this.elasticService.getScrollableList(
            'events',
            '',
            elasticQueryAdapter,
            processEventsAction,
        );

        return result;
    }

    async getEvents(
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

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        await this.elasticService.getScrollableList(
            'events',
            '',
            elasticQueryAdapter,
            action,
        );
    }

    async getPairTradingEvents(
        pairAddress: string,
    ): Promise<RawElasticEventType[]> {
        const pagination = new ElasticPagination();
        pagination.size = 10;

        const elasticQueryAdapter: ElasticQuery =
            new ElasticQuery().withPagination(pagination);

        elasticQueryAdapter.condition.must = [
            QueryType.Match('address', pairAddress),
            QueryType.Should([
                QueryType.Match('identifier', SWAP_IDENTIFIER.SWAP_FIXED_INPUT),
                QueryType.Match(
                    'identifier',
                    SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
                ),
            ]),
        ];
        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.descending },
        ];

        return await this.elasticService.getList(
            'events',
            '',
            elasticQueryAdapter,
        );
    }

    async getTokenTradingEvents(
        tokenID: string,
        pairsAddresses: string[],
        size: number,
    ): Promise<RawElasticEventType[]> {
        const pagination = new ElasticPagination();
        pagination.size = size;

        const elasticQueryAdapter: ElasticQuery =
            new ElasticQuery().withPagination(pagination);

        elasticQueryAdapter.condition.must = [
            QueryType.Match(
                'topics',
                Buffer.from(tokenID, 'utf8').toString('hex'),
            ),
            QueryType.Should([
                QueryType.Match('identifier', SWAP_IDENTIFIER.SWAP_FIXED_INPUT),
                QueryType.Match(
                    'identifier',
                    SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
                ),
            ]),
        ];

        elasticQueryAdapter.filter = [
            new CustomTermsQuery('address', pairsAddresses),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.descending },
        ];

        return await this.elasticService.getList(
            'events',
            '',
            elasticQueryAdapter,
        );
    }
}

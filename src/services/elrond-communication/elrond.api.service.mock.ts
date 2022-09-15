import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';

export class ElrondApiServiceMock {
    async getCurrentEpoch(): Promise<number> {
        return 1;
    }

    async getAccountStats(address: string): Promise<any | undefined> {
        return {
            address: 'user_address_1',
            nonce: 1,
            balance: '1000000000000000000',
            rootHash: 'Xh9naslK9HMLbd3O6ueH04pdfDO0TIsXoM9BF9jouzs=',
            txCount: 1,
            shard: 1,
        };
    }

    async getTokensForUser(address: string): Promise<EsdtToken[]> {
        return [
            new EsdtToken({
                ...Tokens('TOK2-2222'),
                balance: '1000000000000000000',
            }),
        ];
    }

    async getNftsForUser(address: string): Promise<NftToken[]> {
        return [
            {
                collection: 'TOK1TOK4LPStaked',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                decimals: 18,
                balance: '1000000000000000000',
                identifier: 'TOK1TOK4LPStaked-01',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                nonce: 1,
                royalties: 0,
                timestamp: 0,
                uris: [],
                url: '',
                tags: [],
            },
        ];
    }
}

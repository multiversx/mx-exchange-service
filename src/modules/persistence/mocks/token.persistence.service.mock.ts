import { FilterQuery, ProjectionType } from 'mongoose';
import { MockedTokens, Tokens } from 'src/modules/pair/mocks/pair.constants';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import { TokenPersistenceService } from '../services/token.persistence.service';

export class TokenPersistenceServiceMock {
    async getTokens(
        filterQuery: FilterQuery<EsdtTokenDocument>,
        projection?: ProjectionType<EsdtTokenDocument>,
        lean = false,
    ) {
        if (!filterQuery.identifier) {
            return MockedTokens.map((tokenID) => Tokens(tokenID));
        }

        const identifierFilter = filterQuery.identifier;

        if (
            typeof identifierFilter === 'object' &&
            identifierFilter.$in !== undefined &&
            Array.isArray(identifierFilter.$in)
        ) {
            return MockedTokens.filter((tokenID) =>
                (identifierFilter as string[]).includes(tokenID),
            ).map((tokenID) => Tokens(tokenID));
        }

        return [Tokens(identifierFilter)];
    }
}

export const TokenPersistenceServiceProvider = {
    provide: TokenPersistenceService,
    useClass: TokenPersistenceServiceMock,
};

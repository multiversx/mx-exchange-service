import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { TokenPersistenceService } from '../services/token.persistence.service';

export class TokenPersistenceServiceMock {
    async getTokensByIdentifier(tokenIDs: string[]) {
        return tokenIDs.map((tokenID) => Tokens(tokenID));
    }
}

export const TokenPersistenceServiceProvider = {
    provide: TokenPersistenceService,
    useClass: TokenPersistenceServiceMock,
};

import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { TokenRepositoryService } from '../services/token.repository.service';

export class TokenRepositoryServiceMock {
    async getTokenType(tokenID: string): Promise<string> {
        return Tokens(tokenID).type;
    }
}

export const TokenRepositoryServiceProvider = {
    provide: TokenRepositoryService,
    useClass: TokenRepositoryServiceMock,
};

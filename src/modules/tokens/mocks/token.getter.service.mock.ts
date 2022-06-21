import { TokenGetterService } from '../services/token.getter.service';

export class TokenGetterServiceMock {
    async getEsdtTokenType(tokenID: string): Promise<string> {
        return 'Jungle';
    }
}

export const TokenGetterServiceProvider = {
    provide: TokenGetterService,
    useClass: TokenGetterServiceMock,
};

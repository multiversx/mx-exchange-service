import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { TokenComputeService } from '../services/token.compute.service';

export class TokenComputeServiceMock {
    async tokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        return Tokens(tokenID).derivedEGLD;
    }
}

export const TokenComputeServiceProvider = {
    provide: TokenComputeService,
    useClass: TokenComputeServiceMock,
};

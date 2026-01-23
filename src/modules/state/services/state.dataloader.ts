import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokensStateService } from './tokens.state.service';

@Injectable({ scope: Scope.REQUEST })
export class StateDataLoader {
    constructor(protected readonly tokenState: TokensStateService) {}

    private readonly tokenLoader = new DataLoader<string, EsdtToken>(
        async (tokenIDs: string[]) => {
            return this.tokenState.getTokens(tokenIDs);
        },
    );

    async loadToken(tokenID: string): Promise<EsdtToken> {
        return this.tokenLoader.load(tokenID);
    }
}

import { Injectable } from '@nestjs/common';
import { ContextService } from 'src/services/context/context.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondExtrasApiService } from 'src/services/elrond-communication/elrond.extras.api.service';
import { UserService } from '../user/user.service';
import { BoYAccount } from './models/BoYAccount.model';

@Injectable()
export class BattleOfYieldsService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly extrasApiService: ElrondExtrasApiService,
        private readonly context: ContextService,
        private readonly userService: UserService,
    ) {}

    async computeLeaderBoard(): Promise<BoYAccount[]> {
        const boyAddresses = await this.extrasApiService.getBattleOfYieldsList();
        const boyAccounts: BoYAccount[] = [];
        const promises: Promise<number>[] = [];
        for (const address of boyAddresses) {
            promises.push(this.userService.computeUserWorth(address));
        }
        const accountsNetWorth = await Promise.all(promises);
        for (let index = 0; index < boyAddresses.length; index++) {
            if (!accountsNetWorth) {
                continue;
            }
            boyAccounts.push(
                new BoYAccount({
                    address: boyAddresses[index],
                    netWorth: accountsNetWorth[index],
                }),
            );
        }

        return boyAccounts.sort((a, b) => (a.netWorth < b.netWorth ? 1 : -1));
    }
}

import { Injectable } from '@nestjs/common';
import { ElrondExtrasApiService } from 'src/services/elrond-communication/elrond.extras.api.service';
import { UserService } from '../user/user.service';
import { BoYAccount } from './models/BoYAccount.model';

@Injectable()
export class BattleOfYieldsService {
    constructor(
        private readonly extrasApiService: ElrondExtrasApiService,
        private readonly userService: UserService,
    ) {}

    async computeLeaderBoard(): Promise<BoYAccount[]> {
        const boyAddresses = await this.extrasApiService.getBattleOfYieldsList();

        const boyAccounts: BoYAccount[] = [];
        const promises: Promise<BoYAccount>[] = [];
        for (const address of boyAddresses) {
            promises.push(this.userService.computeUserWorth(address));
        }
        const accounts = await Promise.all(promises);
        for (const account of accounts) {
            if (!account) {
                continue;
            }
            boyAccounts.push(account);
        }

        return boyAccounts.sort((a, b) => (a.netWorth < b.netWorth ? 1 : -1));
    }
}

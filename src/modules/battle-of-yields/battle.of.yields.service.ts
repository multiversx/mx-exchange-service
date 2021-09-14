import { Injectable } from '@nestjs/common';
import { ElrondExtrasApiService } from 'src/services/elrond-communication/elrond.extras.api.service';
import { UserService } from '../user/user.service';
import { BoYAccount } from './models/BoYAccount.model';
import asyncPool from 'tiny-async-pool';

@Injectable()
export class BattleOfYieldsService {
    constructor(
        private readonly extrasApiService: ElrondExtrasApiService,
        private readonly userService: UserService,
    ) {}

    async computeLeaderBoard(): Promise<BoYAccount[]> {
        const boyAddresses = await this.extrasApiService.getBattleOfYieldsList();

        const boyAccounts: BoYAccount[] = [];

        const accounts = await asyncPool(
            20,
            boyAddresses.slice(0, 1000),
            address => this.userService.computeUserWorth(address),
        );
        for (const account of accounts) {
            if (!account) {
                continue;
            }
            boyAccounts.push(account);
        }

        return boyAccounts.sort((a, b) => (a.netWorth < b.netWorth ? 1 : -1));
    }
}

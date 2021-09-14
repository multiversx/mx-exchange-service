import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { BoYAccount } from './models/BoYAccount.model';
import asyncPool from 'tiny-async-pool';
import { battleofyields, team } from '../../config/battle-of-yields.json';

@Injectable()
export class BattleOfYieldsService {
    constructor(private readonly userService: UserService) {}

    async computeLeaderBoard(): Promise<BoYAccount[]> {
        const boyAccounts: BoYAccount[] = [];

        const accounts = await asyncPool(
            20,
            battleofyields.slice(0, 10),
            account => this.userService.computeUserWorth(account.address),
        );
        for (const account of accounts) {
            if (!account) {
                continue;
            }
            if (team.find(address => account.address === address)) {
                account.teamMember = true;
            }
            boyAccounts.push(account);
        }

        return boyAccounts.sort((a, b) => (a.netWorth < b.netWorth ? 1 : -1));
    }
}

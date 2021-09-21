import { Inject, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { BoYAccount } from './models/BoYAccount.model';
import asyncPool from 'tiny-async-pool';
import { battleofyields, team } from '../../config/battle-of-yields.json';
import { BattleOfYieldsModel } from './models/battle.of.yields.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class BattleOfYieldsService {
    constructor(
        private readonly userService: UserService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeLeaderBoard(): Promise<BattleOfYieldsModel> {
        const boyAccounts: BoYAccount[] = [];

        let accounts: BoYAccount[];
        try {
            accounts = await asyncPool(5, battleofyields, account =>
                this.userService.computeUserWorth(account.playAddress),
            );
        } catch (error) {
            this.logger.error(
                'an error occured while computing users net worth',
                {
                    path: `${BattleOfYieldsService.name}.${this.computeLeaderBoard.name}`,
                    error,
                },
            );
            throw error;
        }

        for (const account of accounts) {
            if (!account) {
                continue;
            }
            if (team.find(address => account.address === address)) {
                account.teamMember = true;
            }
            boyAccounts.push(account);
        }
        const sortedBoYAccounts = boyAccounts.sort((a, b) =>
            a.netWorth < b.netWorth ? 1 : -1,
        );
        return new BattleOfYieldsModel({
            leaderboard: sortedBoYAccounts,
            timestamp: Date.now().toFixed(),
        });
    }
}

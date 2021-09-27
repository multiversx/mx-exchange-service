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

        try {
            await asyncPool(15, battleofyields, async account => {
                const accountWorth = await this.userService.computeUserWorth(
                    account.playAddress,
                );

                if (!(accountWorth instanceof BoYAccount)) {
                    return;
                }

                if (team.find(address => accountWorth.address === address)) {
                    accountWorth.teamMember = true;
                }
                boyAccounts.push(accountWorth);
            });
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

        const sortedBoYAccounts = boyAccounts.sort((a, b) =>
            a.netWorth < b.netWorth ? 1 : -1,
        );
        return new BattleOfYieldsModel({
            leaderboard: sortedBoYAccounts,
            timestamp: Date.now().toFixed(),
        });
    }
}

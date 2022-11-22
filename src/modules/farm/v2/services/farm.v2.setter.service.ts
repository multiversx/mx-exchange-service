import { Injectable } from '@nestjs/common';
import { FarmSetterService } from '../../base-module/services/farm.setter.service';
import {
    WeeklyRewardsSplittingSetterService
} from '../../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.setter.service';
import { Mixin } from 'ts-mixer';

@Injectable()
export class FarmSetterServiceV2 extends Mixin(FarmSetterService, WeeklyRewardsSplittingSetterService) {}

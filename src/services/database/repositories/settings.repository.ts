import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from './entity.repository';
import {
    Settings,
    SettingsDocument,
} from 'src/modules/remote-config/schemas/settings.schema';

@Injectable()
export class SettingsRepositoryService extends EntityRepository<SettingsDocument> {
    constructor(
        @InjectModel(Settings.name)
        private readonly settingsModel: Model<SettingsDocument>,
    ) {
        super(settingsModel);
    }
}

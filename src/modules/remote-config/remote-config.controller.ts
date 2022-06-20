import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Res,
    UseGuards,
} from '@nestjs/common';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { JwtAdminGuard } from '../auth/jwt.admin.guard';
import { FlagArgs } from './args/flag.args';
import { FlagModel } from './models/flag.model';
import { SCAddressModel, SCAddressType } from './models/sc-address.model';
import { Response } from 'express';
import { RemoteConfigSetterService } from './remote-config.setter.service';

@Controller('remote-config')
export class RemoteConfigController {
    constructor(
        private readonly flagRepositoryService: FlagRepositoryService,
        private readonly scAddressRepositoryService: SCAddressRepositoryService,
        private readonly remoteConfigSetterService: RemoteConfigSetterService,
    ) {}

    @UseGuards(JwtAdminGuard)
    @Post('/flags')
    async addRemoteConfigFlag(@Body() flag: FlagArgs, @Res() res: Response) {
        try {
            if (flag.name && flag.value != null) {
                const result = await this.flagRepositoryService.create(flag);
                this.remoteConfigSetterService.setFlag(
                    result.name,
                    result.value,
                );
                return res.status(201).send(result);
            }

            return res
                .status(500)
                .send(
                    'Flag name & value not found or not in application/json format.',
                );
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }

    @UseGuards(JwtAdminGuard)
    @Put('/flags')
    async updateRemoteConfigFlag(@Body() flag: FlagArgs, @Res() res: Response) {
        try {
            if (flag.name && flag.value != null) {
                const result = await this.flagRepositoryService.findOneAndUpdate(
                    { name: flag.name },
                    flag,
                );
                await this.remoteConfigSetterService.setFlag(
                    result.name,
                    result.value,
                );
                return res.status(201).send(result);
            }

            return res
                .status(500)
                .send(
                    'Flag name & value not found or not in application/json format.',
                );
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }

    @UseGuards(JwtAdminGuard)
    @Get('/flags')
    async getRemoteConfigFlags(): Promise<FlagModel[]> {
        return await this.flagRepositoryService.find({});
    }

    @UseGuards(JwtAdminGuard)
    @Get('/flags/:name')
    async getRemoteConfigFlag(@Param('name') name: string): Promise<FlagModel> {
        return await this.flagRepositoryService.findOne({ name: name });
    }

    @UseGuards(JwtAdminGuard)
    @Delete('/flags/:nameOrID')
    async deleteRemoteConfigFlag(
        @Param('nameOrID') nameOrID: string,
    ): Promise<boolean> {
        try {
            const flag =
                (await this.flagRepositoryService.findOneAndDelete({
                    name: nameOrID,
                })) ||
                (await this.flagRepositoryService.findOneAndDelete({
                    _id: nameOrID,
                }));
            if (flag) {
                await this.remoteConfigSetterService.deleteFlag(flag.name);
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    @UseGuards(JwtAdminGuard)
    @Post('/sc-address')
    async addRemoteConfigSCAddress(
        @Body() scAddress: SCAddressModel,
        @Res() res: Response,
    ) {
        try {
            if (
                scAddress.address &&
                scAddress.category &&
                scAddress.category in SCAddressType
            ) {
                const newSCAddress = await this.scAddressRepositoryService.create(
                    scAddress,
                );
                if (newSCAddress) {
                    await this.remoteConfigSetterService.deleteSCAddresses(
                        scAddress.category,
                    );
                    return res.status(201).send(newSCAddress);
                }
            }

            return res
                .status(500)
                .send(
                    `SC address & category not found, not in application/json format or category not in SCAddressType enum.`,
                );
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }

    @UseGuards(JwtAdminGuard)
    @Get('/sc-address')
    async getRemoteConfigSCAddresses(): Promise<SCAddressModel[]> {
        return await this.scAddressRepositoryService.find({});
    }

    @UseGuards(JwtAdminGuard)
    @Get('/sc-address/:address')
    async getRemoteConfigSCAddress(
        @Param('address') address: string,
    ): Promise<SCAddressModel> {
        return await this.scAddressRepositoryService.findOne({
            address: address,
        });
    }

    @UseGuards(JwtAdminGuard)
    @Delete('/sc-address/:addressOrID')
    async deleteRemoteConfigSCAddress(
        @Param('addressOrID') addressOrID: string,
    ): Promise<boolean> {
        try {
            const entity =
                (await this.scAddressRepositoryService.findOneAndDelete({
                    address: addressOrID,
                })) ||
                (await this.scAddressRepositoryService.findOneAndDelete({
                    _id: addressOrID,
                }));
            if (entity) {
                await this.remoteConfigSetterService.deleteSCAddresses(
                    entity.category,
                );
                return true;
            }
        } catch {
            return false;
        }
    }
}

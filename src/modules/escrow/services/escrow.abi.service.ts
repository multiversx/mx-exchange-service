import {
    Address,
    AddressValue,
    Interaction,
    TypedValue,
} from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from 'src/config';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { SCPermissions, ScheduledTransferModel } from '../models/escrow.model';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { oneDay } from 'src/helpers/helpers';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { CachingService } from 'src/services/caching/cache.service';
import { EscrowSetterService } from './escrow.setter.service';

@Injectable()
export class EscrowAbiService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly mxGateway: MXGatewayService,
        private readonly cachingService: CachingService,
        private readonly escrowSetter: EscrowSetterService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async scheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        return await this.getScheduledTransfersRaw(receiverAddress);
    }

    async getScheduledTransfersRaw(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction =
            contract.methodsExplicit.getScheduledTransfers([
                new AddressValue(Address.fromString(receiverAddress)),
            ]);
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().map(
            (rawValue: TypedValue) =>
                new ScheduledTransferModel({
                    sender: rawValue.valueOf().sender.bech32(),
                    lockedFunds: {
                        funds: rawValue
                            .valueOf()
                            .locked_funds.funds.map(
                                (rawFunds) =>
                                    new EsdtTokenPaymentModel(
                                        EsdtTokenPayment.fromDecodedAttributes(
                                            rawFunds,
                                        ).toJSON(),
                                    ),
                            ),
                        lockedEpoch: rawValue
                            .valueOf()
                            .locked_funds.locked_epoch.toNumber(),
                    },
                }),
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async allSenders(receiverAddress: string): Promise<string[]> {
        return await this.getAllSendersRaw(receiverAddress);
    }

    async getAllSendersRaw(receiverAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction = contract.methodsExplicit.getAllSenders(
            [new AddressValue(Address.fromString(receiverAddress))],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue
            .valueOf()
            .map((rawAddress: AddressValue) => rawAddress.valueOf().bech32());
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async allReceivers(senderAddress: string): Promise<string[]> {
        return await this.getAllReceiversRaw(senderAddress);
    }

    async getAllReceiversRaw(senderAddress: string): Promise<string[]> {
        let hexValues = await this.cachingService.getCache<object>(
            `escrow.scKeys`,
        );
        if (!hexValues || hexValues === undefined) {
            hexValues = await this.mxGateway.getSCStorageKeys(
                scAddress.escrow,
                [],
            );
            await this.escrowSetter.setSCStorageKeys(hexValues);
        }

        const receivers = [];
        const allSendersHex = Buffer.from('allSenders').toString('hex');
        const itemHex = Buffer.from('.item').toString('hex');

        for (const key of Object.keys(hexValues)) {
            const value = hexValues[key];
            if (
                key.includes(allSendersHex) &&
                key.includes(itemHex) &&
                Address.fromHex(value).bech32() === senderAddress
            ) {
                const receiverHex = key
                    .split(allSendersHex)[1]
                    .split(itemHex)[0];
                receivers.push(Address.fromHex(receiverHex).bech32());
            }
        }

        return receivers.filter((v, i, a) => a.indexOf(v) === i);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async senderLastTransferEpoch(senderAddress: string): Promise<number> {
        return await this.getSenderLastTransferEpochRaw(senderAddress);
    }

    async getSenderLastTransferEpochRaw(address: string): Promise<number> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['senderLastTransferEpoch', Address.fromString(address)],
        );
        return hexValue === '' ? 0 : new BigNumber(hexValue, 16).toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async receiverLastTransferEpoch(receiverAddress: string): Promise<number> {
        return await this.getReceiverLastTransferEpochRaw(receiverAddress);
    }

    async getReceiverLastTransferEpochRaw(address: string): Promise<number> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['receiverLastTransferEpoch', Address.fromString(address)],
        );
        return hexValue === '' ? 0 : new BigNumber(hexValue, 16).toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async energyFactoryAddress(): Promise<string> {
        return await this.getEnergyFactoryAddressRaw();
    }

    async getEnergyFactoryAddressRaw(): Promise<string> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['energyFactoryAddress'],
        );
        return Address.fromHex(hexValue).bech32();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async lockedTokenID(): Promise<string> {
        return await this.getLockedTokenIDRaw();
    }

    async getLockedTokenIDRaw(): Promise<string> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['lockedTokenId'],
        );
        return Buffer.from(hexValue, 'hex').toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async minLockEpochs(): Promise<number> {
        return await this.getMinLockEpochsRaw();
    }

    async getMinLockEpochsRaw(): Promise<number> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['minLockEpochs'],
        );

        return new BigNumber(hexValue, 16).toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async epochsCooldownDuration(): Promise<number> {
        return await this.getEpochCooldownDurationRaw();
    }

    async getEpochCooldownDurationRaw(): Promise<number> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['epochsCooldownDuration'],
        );

        return new BigNumber(hexValue, 16).toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async addressPermission(address: string): Promise<SCPermissions[]> {
        const addressesWithPermissions =
            await this.allAddressesWithPermissions();
        if (!addressesWithPermissions.includes(address)) {
            return [SCPermissions.NONE];
        }

        return await this.getAddressPermissionRaw(address);
    }

    async getAddressPermissionRaw(address: string): Promise<SCPermissions[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction =
            contract.methodsExplicit.getPermissions([
                new AddressValue(Address.fromString(address)),
            ]);

        const response = await this.getGenericData(interaction);
        const permissions = response.firstValue.valueOf().toNumber();
        switch (permissions) {
            case 0:
                return [SCPermissions.NONE];
            case 1:
                return [SCPermissions.OWNER];
            case 2:
                return [SCPermissions.ADMIN];
            case 3:
                return [SCPermissions.OWNER, SCPermissions.ADMIN];
            case 4:
                return [SCPermissions.PAUSE];
            default:
                return [];
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'escrow',
        remoteTtl: oneDay(),
    })
    async allAddressesWithPermissions(): Promise<string[]> {
        return await this.getAllAddressesWithPermissionsRaw();
    }

    async getAllAddressesWithPermissionsRaw(): Promise<string[]> {
        let hexValues = await this.cachingService.getCache<object>(
            `escrow.scKeys`,
        );
        if (!hexValues || hexValues === undefined) {
            hexValues = await this.mxGateway.getSCStorageKeys(
                scAddress.escrow,
                [],
            );
            await this.escrowSetter.setSCStorageKeys(hexValues);
        }

        const addresses = [];
        const permissionsHex = Buffer.from('permissions').toString('hex');
        Object.keys(hexValues).forEach((key) => {
            if (key.includes(permissionsHex)) {
                const addressHex = key.split(permissionsHex)[1];
                addresses.push(Address.fromHex(addressHex).bech32());
            }
        });

        return addresses;
    }
}

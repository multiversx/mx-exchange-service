import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { PairInfoModel } from '../models/pair-info.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import BigNumber from 'bignumber.js';
import { FeeDestination } from '../models/pair.model';
import {
    EsdtTokenPayment,
    EsdtTokenPaymentStruct,
    EsdtTokenType,
} from 'src/models/esdtTokenPayment.model';
import {
    Address,
    AddressValue,
    BigUIntValue,
    EnumValue,
    Field,
    ResultsParser,
    Struct,
    TokenIdentifierValue,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { elrondConfig } from 'src/config';
import { VmQueryError } from 'src/utils/errors.constants';

@Injectable()
export class PairAbiService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFirstTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getSecondTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpTokenIdentifier();

        const response = await this.getGenericData(interaction);
        const lpTokenID = response.firstValue.valueOf().toString();
        return lpTokenID !== elrondConfig.EGLDIdentifier
            ? lpTokenID
            : undefined;
    }

    async getTokenReserve(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getReserve([
            new TokenIdentifierValue(tokenID),
        ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getTotalSupply();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getReservesAndTotalSupply();

        const response = await this.getGenericData(interaction);
        return new PairInfoModel({
            reserves0: response.values[0].valueOf().toFixed(),
            reserves1: response.values[1].valueOf().toFixed(),
            totalSupply: response.values[2].valueOf().toFixed(),
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getTotalFeePercent();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getSpecialFee();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getTrustedSwapPairs();

        const response = await this.getGenericData(interaction);
        return response.firstValue
            .valueOf()
            .map((swapPair) => swapPair.field1.bech32());
    }

    async getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        try {
            const interaction: Interaction =
                contract.methodsExplicit.getInitialLiquidtyAdder();
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            if (
                queryResponse.returnMessage.includes(
                    VmQueryError.BAD_ARRAY_LENGTH,
                )
            ) {
                return '';
            }
            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            if (!response.firstValue.valueOf()) {
                return '';
            }
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return '';
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLockingScAddress.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getState(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getState([]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().name;
    }

    async getFeeState(pairAddress: string): Promise<boolean> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getFeeState(
            [],
        );

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getLockingScAddress(
        pairAddress: string,
    ): Promise<string | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        try {
            const interaction: Interaction =
                contract.methodsExplicit.getLockingScAddress();
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            if (
                queryResponse.returnMessage.includes(
                    VmQueryError.BAD_ARRAY_LENGTH,
                ) ||
                queryResponse.returnCode === VmQueryError.FUNCTION_NOT_FOUND
            ) {
                return undefined;
            }
            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return undefined;
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLockingScAddress.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getUnlockEpoch(pairAddress: string): Promise<number | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getUnlockEpoch();
        try {
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            if (queryResponse.returnCode === VmQueryError.FUNCTION_NOT_FOUND) {
                return undefined;
            }
            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            const unlockEpoch = response.firstValue.valueOf();
            return unlockEpoch !== undefined
                ? unlockEpoch.toFixed()
                : undefined;
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return undefined;
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getUnlockEpoch.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getLockingDeadlineEpoch(
        pairAddress: string,
    ): Promise<number | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockingDeadlineEpoch();
        try {
            const query = interaction.check().buildQuery();
            const queryResponse = await this.elrondProxy
                .getService()
                .queryContract(query);
            if (queryResponse.returnCode === VmQueryError.FUNCTION_NOT_FOUND) {
                return undefined;
            }
            const endpointDefinition = interaction.getEndpoint();
            const response = new ResultsParser().parseQueryResponse(
                queryResponse,
                endpointDefinition,
            );
            const lockingDeadlineEpoch = response.firstValue.valueOf();
            return lockingDeadlineEpoch !== undefined
                ? lockingDeadlineEpoch.toFixed()
                : undefined;
        } catch (error) {
            if (error.message.includes(VmQueryError.INVALID_FUNCTION)) {
                return undefined;
            }
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                this.getLockingDeadlineEpoch.name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getFeeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFeeDestinations(
            [],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((v) => {
            return new FeeDestination({
                address: new Address(
                    response.firstValue.valueOf()[0].field0,
                ).bech32(),
                tokenID: response.firstValue.valueOf()[0].field1.toString(),
            });
        });
    }

    async getWhitelistedManagedAddresses(
        pairAddress: string,
    ): Promise<string[]> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methods.getWhitelistedManagedAddresses([]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((v) => {
            return new Address(v).bech32();
        });
    }

    async getRouterManagedAddress(address: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(address);
        const interaction: Interaction =
            contract.methods.getRouterManagedAddress([]);
        const response = await this.getGenericData(interaction);
        return new Address(response.firstValue.valueOf().toString()).bech32();
    }

    async getRouterOwnerManagedAddress(address: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(address);
        const interaction: Interaction =
            contract.methods.getRouterOwnerManagedAddress([]);
        const response = await this.getGenericData(interaction);
        return new Address(response.firstValue.valueOf().toString()).bech32();
    }

    async getExternSwapGasLimit(pairAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getExternSwapGasLimit(
            [],
        );
        const response = await this.getGenericData(interaction);
        const res = response.firstValue.valueOf();
        return res !== undefined ? res.toFixed() : undefined;
    }

    async getTransferExecGasLimit(pairAddress: string): Promise<number> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction =
            contract.methods.getTransferExecGasLimit([]);
        const response = await this.getGenericData(interaction);
        const res = response.firstValue.valueOf();
        return res !== undefined ? res.toFixed() : undefined;
    }

    async updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.updateAndGetSafePrice(
            [
                new Struct(EsdtTokenPaymentStruct.getStructure(), [
                    new Field(
                        new EnumValue(
                            EsdtTokenType.getEnum(),
                            EsdtTokenType.getEnum().getVariantByDiscriminant(
                                esdtTokenPayment.tokenType,
                            ),
                            [],
                        ),
                        'token_type',
                    ),
                    new Field(
                        new TokenIdentifierValue(
                            Buffer.from(esdtTokenPayment.tokenID).toString(),
                        ),
                        'token_identifier',
                    ),
                    new Field(
                        new U64Value(new BigNumber(esdtTokenPayment.nonce)),
                        'token_nonce',
                    ),
                    new Field(
                        new BigUIntValue(
                            new BigNumber(esdtTokenPayment.amount),
                        ),
                        'amount',
                    ),
                ]),
            ],
        );

        const response = await this.getGenericData(interaction);
        return new EsdtTokenPayment({
            tokenType: EsdtTokenType.getEnum().getVariantByName(
                response.firstValue.valueOf().token_type.name,
            ).discriminant,
            tokenID: response.firstValue.valueOf().token_identifier.toString(),
            nonce: new BigNumber(
                response.firstValue.valueOf().token_nonce,
            ).toNumber(),
            amount: new BigNumber(
                response.firstValue.valueOf().amount,
            ).toFixed(),
        });
    }

    async getNumSwapsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getNumSwapsByAddress([
            new AddressValue(Address.fromString(address)),
        ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async getNumAddsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getNumAddsByAddress([
            new AddressValue(Address.fromString(address)),
        ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}

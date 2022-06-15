import { Inject, Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import {
    Address,
    BigUIntValue,
    EnumValue,
    Field,
    QueryResponseBundle,
    Struct,
    TokenIdentifierValue,
    U64Value,
} from '@elrondnetwork/erdjs';
import { PairInfoModel } from '../models/pair-info.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import BigNumber from 'bignumber.js';
import { FeeDestination } from '../models/pair.model';
import {
    EsdtTokenPayment,
    EsdtTokenPaymentStruct,
    EsdtTokenType,
} from 'src/models/esdtTokenPayment.model';

@Injectable()
export class PairAbiService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getGenericData(
        contract: SmartContractProfiler,
        interaction: Interaction,
    ): Promise<QueryResponseBundle> {
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            return interaction.interpretQueryResponse(queryResponse);
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFirstTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getSecondTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getLpTokenIdentifier(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        const lpTokenID = response.firstValue.valueOf().toString();
        return lpTokenID !== 'EGLD' ? lpTokenID : undefined;
    }

    async getTokenReserve(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getReserve([
            BytesValue.fromUTF8(tokenID),
        ]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getTotalSupply([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getReservesAndTotalSupply(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
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
        const interaction: Interaction = contract.methods.getTotalFeePercent(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getSpecialFee([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getTrustedSwapPairs(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue
            .valueOf()
            .map(swapPair => swapPair.field1.bech32());
    }

    async getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        try {
            const interaction: Interaction = contract.methods.getInitialLiquidtyAdder(
                [],
            );
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            if (queryResponse.returnMessage.includes('bad array length')) {
                return '';
            }
            const response = interaction.interpretQueryResponse(queryResponse);
            if (!response.firstValue.valueOf()) {
                return '';
            }
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            if (error.message.includes('invalid function')) {
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
        const interaction: Interaction = contract.methods.getState([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().name;
    }

    async getLockingScAddress(
        pairAddress: string,
    ): Promise<string | undefined> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        try {
            const interaction: Interaction = contract.methods.getLockingScAddress(
                [],
            );
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            if (queryResponse.returnMessage.includes('bad array length')) {
                return undefined;
            }
            const response = interaction.interpretQueryResponse(queryResponse);
            return response.firstValue.valueOf().bech32();
        } catch (error) {
            if (error.message.includes('invalid function')) {
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
        const interaction: Interaction = contract.methods.getUnlockEpoch([]);
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const unlockEpoch = response.firstValue.valueOf();
            return unlockEpoch !== undefined
                ? unlockEpoch.toFixed()
                : undefined;
        } catch (error) {
            if (error.message.includes('invalid function')) {
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
        const interaction: Interaction = contract.methods.getLockingDeadlineEpoch(
            [],
        );
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            const lockingDeadlineEpoch = response.firstValue.valueOf();
            return lockingDeadlineEpoch !== undefined
                ? lockingDeadlineEpoch.toFixed()
                : undefined;
        } catch (error) {
            if (error.message.includes('invalid function')) {
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

    async getFeeState(pairAddress: string): Promise<Boolean> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFeeState([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getFeeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFeeDestinations(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().map(v => {
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
        const interaction: Interaction = contract.methods.getWhitelistedManagedAddresses(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().map(v => {
            return new Address(v).bech32();
        });
    }

    async getRouterManagedAddress(address: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(address);
        const interaction: Interaction = contract.methods.getRouterManagedAddress(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return new Address(response.firstValue.valueOf().toString()).bech32();
    }

    async getRouterOwnerManagedAddress(address: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(address);
        const interaction: Interaction = contract.methods.getRouterOwnerManagedAddress(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return new Address(response.firstValue.valueOf().toString()).bech32();
    }

    async getExternSwapGasLimit(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getExternSwapGasLimit(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getTransferExecGasLimit(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getTransferExecGasLimit(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
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
                            Buffer.from(esdtTokenPayment.tokenID),
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

        const response = await this.getGenericData(contract, interaction);
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
            ).toString(),
        });
    }

    async getNumSwapsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getNumSwapsByAddress([
            BytesValue.fromHex(new Address(address).hex()),
        ]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getNumAddsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getNumSwapsByAddress([
            BytesValue.fromHex(new Address(address).hex()),
        ]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }
}

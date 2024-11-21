import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { GlobalState, GlobalStateInitStatus } from './global.state';

export function memoryStoreTransformer(
    schema: GraphQLSchema,
    directiveName: string,
) {
    return mapSchema(schema, {
        [MapperKind.OBJECT_TYPE]: (fieldConfig) => {
            const memoryStoreDirective = getDirective(
                schema,
                fieldConfig,
                directiveName,
            )?.[0];

            if (fieldConfig.name === 'PairModel') {
                console.log(fieldConfig);
            }

            if (memoryStoreDirective) {
                const fields = fieldConfig.getFields();

                for (const [fieldName, fieldValue] of Object.entries(fields)) {
                    if (fieldName === 'firstToken') {
                        console.log(fieldValue);
                        const { resolve = defaultFieldResolver } = fieldValue;
                        fieldValue.resolve = async function (
                            source,
                            args,
                            context,
                            info,
                        ) {
                            if (
                                GlobalState.initStatus ===
                                GlobalStateInitStatus.DONE
                            ) {
                                return source.firstToken;
                            }

                            // console.log(source);

                            console.log('regular resolve');
                            const result = await resolve(
                                source,
                                args,
                                context,
                                info,
                            );

                            return result;
                        };
                    }
                }
                // const { resolve = defaultFieldResolver } = fieldConfig;

                // Replace the original resolver with a function that *first* calls
                // the original resolver, then converts its result to upper case
                // fieldConfig.resolve = async function (
                //     source,
                //     args,
                //     context,
                //     info,
                // ) {
                //     console.log('apply directive');
                //     const result = await resolve(source, args, context, info);

                //     return result;
                // };

                return fieldConfig;
            }
        },
        // [MapperKind.QUERY_ROOT_FIELD]: (fieldConfig) => {
        //     const memoryStoreDirective = getDirective(
        //         schema,
        //         fieldConfig,
        //         directiveName,
        //     )?.[0];

        //     if (memoryStoreDirective) {
        //         const { resolve = defaultFieldResolver } = fieldConfig;

        //         fieldConfig.resolve = async function (
        //             source,
        //             args,
        //             context,
        //             info,
        //         ) {
        //             if (GlobalState.initStatus === GlobalStateInitStatus.DONE) {
        //                 console.log('return from store');
        //                 return GlobalState.getPairsArray();
        //             }

        //             console.log('regular resolve');
        //             const result = await resolve(source, args, context, info);

        //             return result;
        //         };

        //         return fieldConfig;
        //     }
        // },
    });
}

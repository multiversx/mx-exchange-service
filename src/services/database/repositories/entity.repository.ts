import { Document, FilterQuery, Model, UpdateQuery } from 'mongoose';

export abstract class EntityRepository<T extends Document> {
    constructor(protected readonly entityModel: Model<T>) { }

    async create(createEntityData: any): Promise<T> {
        const entity = new this.entityModel(createEntityData);
        return entity.save();
    }

    async findOne(
        entityFilterQuery: FilterQuery<T>,
        projection?: Record<string, unknown>,
    ): Promise<T | null> {
        return this.entityModel
            .findOne(entityFilterQuery, {
                _id: 0,
                __v: 0,
                ...projection,
            })
            .exec();
    }

    async find(
        entityFilterQuery: FilterQuery<T>,
        projection?: Record<string, unknown>,
    ): Promise<T[] | null> {
        return this.entityModel.find(entityFilterQuery, {
            _id: 0,
            __v: 0,
            ...projection,
        });
    }

    async findOneAndUpdate(
        entityFilterQuery: FilterQuery<T>,
        updateEntityData: UpdateQuery<any>,
        projection?: Record<string, unknown>,
        upsert?: boolean,
    ): Promise<T | null> {
        return this.entityModel.findOneAndUpdate(
            entityFilterQuery,
            updateEntityData,
            {
                new: true,
                upsert,
                projection: {
                    _id: 0,
                    __v: 0,
                    ...projection,
                },
            },
        );
    }

    async findOneAndDelete(
        entityFilterQuery: FilterQuery<T>,
    ): Promise<T | null> {
        return await this.entityModel.findOneAndDelete(entityFilterQuery);
    }

    async deleteMany(entityFilterQuery: FilterQuery<T>): Promise<boolean> {
        const deleteResult = this.entityModel.deleteMany(entityFilterQuery);
        return (await deleteResult).deletedCount >= 1;
    }
}

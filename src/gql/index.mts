import { GraphQLSchema } from 'graphql';
import { BaseSchema } from '../shared/baseSchema.mjs';
import { MutationIndex } from './mutation/index.mjs';
import { QueryIndex } from './query/index.mjs';

export class ApiSchema extends BaseSchema {
	public override async schema(): Promise<GraphQLSchema> {
		return new GraphQLSchema({
			query: await new QueryIndex(this.helpers).gqlQueryType(),
			mutation: await new MutationIndex(this.helpers).gqlMutationType(),
		});
	}
}

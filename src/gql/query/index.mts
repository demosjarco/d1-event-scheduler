import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';
import { GraphQLNonEmptyString } from 'graphql-scalars';
import { BaseSchema } from '../../shared/baseSchema.mjs';

export class QueryIndex extends BaseSchema {
	protected override async createQueryType(): Promise<void> {
		this.queryType = new GraphQLObjectType({
			name: 'Query',
			fields: {
				hello: {
					type: new GraphQLNonNull(GraphQLNonEmptyString),
					resolve: () => 'Hello World!',
				},
			},
		});
	}
}

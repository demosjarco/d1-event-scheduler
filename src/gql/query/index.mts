import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';
import { BaseSchema } from '../../shared/baseSchema.mjs';

export class QueryIndex extends BaseSchema {
	protected override async createQueryType(): Promise<void> {
		this.queryType = new GraphQLObjectType({
			name: 'Query',
			fields: {
				hello: {
					type: new GraphQLNonNull(GraphQLString),
					resolve: () => 'Hello World!',
				},
			},
		});
	}
}

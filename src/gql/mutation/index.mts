import { GraphQLNonNull, GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import { GraphQLNonEmptyString } from 'graphql-scalars';
import { BaseSchema } from '../../shared/baseSchema.mjs';
import type { GqlContext } from '../../types.mjs';

export class MutationIndex extends BaseSchema {
	protected override async createMutationType(): Promise<void> {
		this.mutationType = new GraphQLObjectType({
			name: 'Mutation',
			fields: {
				hello: {
					args: {
						name: { type: new GraphQLNonNull(GraphQLNonEmptyString) },
					},
					type: new GraphQLNonNull(GraphQLNonEmptyString),
					resolve: (obj: {}, args: { name: string }, context: GqlContext, info: GraphQLResolveInfo) => `Hello ${args.name}`,
				},
			},
		});
	}
}

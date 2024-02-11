import { GraphQLNonNull, GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import { GraphQLJSON, GraphQLNonEmptyString } from 'graphql-scalars';
import { BaseSchema } from '../../shared/baseSchema.mjs';
import type { GqlContext } from '../../types.mjs';

export class QueryIndex extends BaseSchema {
	protected override async createQueryType(): Promise<void> {
		this.queryType = new GraphQLObjectType({
			name: 'Query',
			fields: {
				getEvents: {
					type: GraphQLJSON,
					resolve: async (obj: {}, args: {}, context: GqlContext, info: GraphQLResolveInfo) => {
						const response = await context.D1_EVENT_SCHEDULER.get(context.D1_EVENT_SCHEDULER.idFromName('d1.event')).fetch(
							new Request(new URL('https://d1.event'), {
								// @ts-expect-error
								cf: context.request.cf,
							}),
						);

						return {
							headers: Object.fromEntries(response.headers.entries()),
							// @ts-expect-error
							cf: response.cf ?? context.request.cf,
							body: await response.text(),
						};
					},
				},
				hello: {
					type: new GraphQLNonNull(GraphQLNonEmptyString),
					resolve: () => 'Hello World!',
				},
			},
		});
	}
}

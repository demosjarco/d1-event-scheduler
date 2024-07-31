import type { GraphQLFieldConfigArgumentMap, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';
import { GraphQLSchema } from 'graphql';
import type { ArgsType, GqlContext } from '../types.mjs';
import { Base } from './base.mjs';

export abstract class BaseSchema extends Base {
	protected argsType: GraphQLFieldConfigArgumentMap = {};
	protected queryType: GraphQLObjectType | undefined;
	protected mutationType: GraphQLObjectType | undefined;

	// Mutations
	protected async createMutationHelperTypes(): Promise<void> {
		return;
	}
	protected async createMutationType(): Promise<void> {
		return;
	}

	// Queries
	protected async createQueryHelperTypes(): Promise<void> {
		return;
	}
	protected async createQueryType(): Promise<void> {
		return;
	}

	public get gqlArgsType(): GraphQLFieldConfigArgumentMap {
		return this.argsType;
	}

	public async gqlMutationType(): Promise<GraphQLObjectType | undefined> {
		await this.createMutationHelperTypes();
		await this.createMutationType();

		return this.mutationType;
	}

	public async gqlQueryType(): Promise<GraphQLObjectType | undefined> {
		await this.createQueryHelperTypes();
		await this.createQueryType();

		return this.queryType;
	}

	// Resolving queries
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async gqlResolve(_obj: object, _args: ArgsType<typeof this.argsType>, _context: GqlContext, _info: GraphQLResolveInfo): Promise<Record<string, unknown>> {
		return {};
	}

	// Setup
	public async schema(): Promise<GraphQLSchema> {
		return new GraphQLSchema({});
	}
}

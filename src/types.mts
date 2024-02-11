import type { GraphQLFieldConfigArgumentMap, GraphQLScalarType } from 'graphql';
import type { Context } from 'hono';

export type AppContext = Context<{ Bindings: EnvVars }> | CustomContext<EnvVars>;

type CustomContext<T extends Record<string, any>> = {
	req: {
		raw: Request;
	};
	env: T;
	executionCtx: ExecutionContext;
};

export interface EnvVars extends Secrets, Bindings, Record<string, any> {
	GIT_HASH?: string;
	NODE_ENV: 'production' | 'development';
}

interface Secrets extends Record<string, any> {}

interface Bindings {}

export interface GqlContext extends EnvVars, ExecutionContext {
	request: Request;
}

type GraphQLTypeToTs<T> = T extends GraphQLScalarType ? ReturnType<T['parseValue']> : any;

export type ArgsType<T extends GraphQLFieldConfigArgumentMap> = {
	[K in keyof T]: GraphQLTypeToTs<T[K]['type']>;
};

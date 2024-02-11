export interface EnvVars extends Secrets, Bindings, Record<string, any> {
	GIT_HASH?: string;
	NODE_ENV: 'production' | 'development';
}

interface Secrets extends Record<string, any> {}

interface Bindings {}

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['./src/server.ts'],
	tsconfig: './tsconfig.json',
	nodeProtocol: true,
	minify: true,
	treeshake: true,
});

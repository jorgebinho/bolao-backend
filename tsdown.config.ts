import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: 'src/**/*.ts',
	tsconfig: './tsconfig.json',
	platform: 'node',
	nodeProtocol: true,
	minify: true,
	dts: true,
	clean: true,
	deps: {
		neverBundle: ['@prisma/client', 'prisma'],
		skipNodeModulesBundle: true,
	},
});

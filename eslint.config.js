import tseslint from 'typescript-eslint'
export default [
 { ignores: ['src/routeTree.gen.ts', 'node_modules/**', 'dist/**', '.output/**'] },
 ...tseslint.configs.recommended,
]

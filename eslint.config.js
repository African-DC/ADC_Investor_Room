import tseslint from 'typescript-eslint'
export default [
 { ignores: ['src/routeTree.gen.ts','convex/_generated/**','node_modules/**','dist/**','.output/**'] },
 ...tseslint.configs.recommended,
]

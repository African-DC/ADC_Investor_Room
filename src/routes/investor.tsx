import { createFileRoute, redirect } from '@tanstack/react-router'
// Fail closed until server-side verified identity and room authorization are integrated.
export const Route = createFileRoute('/investor')({beforeLoad:()=>{throw redirect({to:'/'})}})

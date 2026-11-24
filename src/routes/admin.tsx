import { createFileRoute, redirect } from '@tanstack/react-router'
// Never expose an admin shell or data before E04/E05.
export const Route = createFileRoute('/admin')({beforeLoad:()=>{throw redirect({to:'/'})}})

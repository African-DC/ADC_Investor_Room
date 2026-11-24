import { createFileRoute } from '@tanstack/react-router'
import { deliverDocument } from '../../../server/documentDelivery'
export const Route=createFileRoute('/api/documents/file')({server:{handlers:{GET:({request})=>deliverDocument(request)}}})

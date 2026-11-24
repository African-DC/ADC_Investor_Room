import {createFileRoute} from '@tanstack/react-router'
import {uploadDocument} from '../../../server/documentUpload'
export const Route=createFileRoute('/api/documents/upload')({server:{handlers:{POST:({request})=>uploadDocument(request)}}})

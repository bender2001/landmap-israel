import { useMutation } from '@tanstack/react-query'
import { createLead } from '../api/leads.js'

export function useCreateLead() {
  return useMutation({
    mutationFn: createLead,
  })
}

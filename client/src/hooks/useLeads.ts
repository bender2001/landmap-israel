import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { createLead } from '../api/leads'

type CreateLeadInput = Parameters<typeof createLead>[0]
type CreateLeadResult = Awaited<ReturnType<typeof createLead>>

export function useCreateLead(): UseMutationResult<CreateLeadResult, Error, CreateLeadInput> {
  return useMutation({
    mutationFn: createLead,
  })
}

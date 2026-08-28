import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listCases } from '../services/api'

export function useSelectedCaseId() {
  const [params, setParams] = useSearchParams()
  const [caseId, setCaseId] = useState(params.get('case') || '')

  useEffect(() => {
    const fromUrl = params.get('case') || ''
    if (fromUrl) { setCaseId(fromUrl); return }
    listCases({ limit: 1 }).then(response => {
      const first = response.cases[0]?.case_id
      if (first) { setCaseId(first); setParams({ case: first }) }
    }).catch(() => undefined)
  }, [params, setParams])

  return { caseId, setCaseId }
}

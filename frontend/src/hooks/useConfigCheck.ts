import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ConfigCheck } from "@/types"

export function useConfigCheck() {
  const { data, isLoading } = useQuery<ConfigCheck>({
    queryKey: ["config-check"],
    queryFn: () => api.configCheck.check(),
    staleTime: 30_000,
  })

  return {
    ready: data?.ready ?? true,
    checks: data?.checks ?? [],
    isLoading,
  }
}

import { Badge } from "@/components/ui/badge"
import { formatPerc } from "@/lib/utils"

interface MarginBadgeProps {
  perc: number
}

export function MarginBadge({ perc }: MarginBadgeProps) {
  if (perc > 30) {
    return <Badge variant="success">{formatPerc(perc)}</Badge>
  }
  if (perc >= 10) {
    return <Badge variant="warning">{formatPerc(perc)}</Badge>
  }
  return (
    <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">
      {formatPerc(perc)}
    </Badge>
  )
}

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageLayoutProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
}

export function PageLayout({ title, description, actions, children, className }: PageLayoutProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {title}
          </h1>
          {description && (
            <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Animated stagger container — wrap lists/grids for entry animation */
export function StaggerContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Individual stagger item */
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}

/** Consistent empty state component */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--muted-bg)" }}
      >
        <div className="text-2xl opacity-50">{icon}</div>
      </div>
      <p className="font-semibold text-base" style={{ color: "var(--text)" }}>{title}</p>
      {description && (
        <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--muted-text)" }}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

/** Stat card with accent-colored metric */
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
  color?: string
}) {
  const trendColors = { up: "var(--success)", down: "var(--error)", neutral: "var(--muted-text)" }
  const trendColor = trend ? trendColors[trend] : undefined

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl border p-5 space-y-3"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
          {label}
        </p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: color ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--muted-bg)" }}
        >
          <span style={{ color: color ?? "var(--muted-text)" }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>
        {value}
      </p>
      {trendLabel && (
        <p className="text-xs" style={{ color: trendColor }}>
          {trendLabel}
        </p>
      )}
    </motion.div>
  )
}

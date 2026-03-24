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
      className={cn("page-layout", className)}
    >
      <motion.div variants={itemVariants} className="page-layout__header">
        <div className="page-layout__heading">
          <div className="page-layout__eyebrow">ERP Workspace</div>
          <h1 className="page-layout__title">
            {title}
          </h1>
          {description && (
            <p className="page-layout__description">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="page-layout__actions">{actions}</div>}
      </motion.div>

      <motion.div variants={itemVariants} className="page-layout__body">
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
      className="empty-shell"
    >
      <div
        className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[22px]"
        style={{ background: "var(--muted-bg)", color: "var(--accent)" }}
      >
        <div className="text-2xl opacity-50">{icon}</div>
      </div>
      <p className="empty-shell__title">{title}</p>
      {description && (
        <p className="empty-shell__description">{description}</p>
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
      className="rounded-[24px] border p-5 space-y-4"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--muted-text-light)" }}>
          {label}
        </p>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: color ? `color-mix(in srgb, ${color} 14%, transparent)` : "var(--muted-bg)" }}
        >
          <span style={{ color: color ?? "var(--muted-text)" }}>{icon}</span>
        </div>
      </div>
      <p className="text-[1.85rem] font-bold tabular-nums tracking-tight" style={{ color: color ?? "var(--text)" }}>
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

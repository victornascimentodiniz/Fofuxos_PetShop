
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
}

const variants = {
  primary: {
    icon: 'bg-brand-primary-light text-brand-primary',
    text: 'text-brand-primary',
  },
  secondary: {
    icon: 'bg-brand-secondary-light text-brand-secondary-dark',
    text: 'text-brand-secondary-dark',
  },
  danger: {
    icon: 'bg-red-50 text-red-500',
    text: 'text-red-500',
  },
  neutral: {
    icon: 'bg-blue-50 text-blue-600',
    text: 'text-blue-600',
  },
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'primary',
}: StatCardProps) {
  const style = variants[variant]

  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">

      <div className="flex items-center justify-between gap-2">

        <p className="text-sm font-medium text-gray-500">
          {title}
        </p>

        <div
          className={`
            flex h-11 w-11 shrink-0 items-center
            justify-center rounded-xl
            ${style.icon}
          `}
        >
          <Icon size={21} />
        </div>

      </div>

      <h2 className="mt-4 text-2xl font-bold tracking-tight text-brand-dark tabular-nums">
        {value}
      </h2>

      <p className={`mt-2 text-xs font-medium ${style.text}`}>
        {description}
      </p>

    </article>
  )
}

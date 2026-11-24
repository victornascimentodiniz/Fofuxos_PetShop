
import { Construction, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PlaceholderProps {
  title: string
}

export default function Placeholder({
  title,
}: PlaceholderProps) {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-brand-dark">
          {title}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Gerenciamento de {title.toLowerCase()}.
        </p>
      </div>

      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-secondary-light">

          <Construction
            size={38}
            className="text-brand-secondary-dark"
          />

        </div>

        <h2 className="text-xl font-bold">
          Módulo em desenvolvimento
        </h2>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
          Este módulo será implementado nas próximas etapas
          do desenvolvimento do Fofuxos Gestão.
        </p>

        <Link
          to="/"
          className="mt-7 flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark"
        >
          <ArrowLeft size={18} />
          Voltar para visão geral
        </Link>

      </div>
    </div>
  )
}

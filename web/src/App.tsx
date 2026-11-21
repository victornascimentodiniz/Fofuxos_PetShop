import { PawPrint, CheckCircle2 } from 'lucide-react'

function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-background p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-secondary/15">
          <PawPrint
            size={42}
            className="text-brand-secondary"
          />
        </div>

        <h1 className="text-4xl font-bold text-brand-primary">
          Fofuxos
        </h1>

        <p className="mt-2 text-sm font-medium tracking-widest text-brand-secondary uppercase">
          Sistema de Gestão
        </p>

        <div className="my-8 h-px bg-gray-100" />

        <div className="flex items-center justify-center gap-2 text-emerald-600">
          <CheckCircle2 size={20} />

          <span className="font-medium">
            Ambiente configurado
          </span>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Sistema de gerenciamento comercial,
          financeiro e de estoque.
        </p>

        <div className="mt-8 rounded-xl bg-brand-primary px-6 py-3 font-semibold text-white">
          Fofuxos Gestão • v0.1.0
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Projeto Integrador — UNIPAM
        </p>

      </div>
    </main>
  )
}

export default App
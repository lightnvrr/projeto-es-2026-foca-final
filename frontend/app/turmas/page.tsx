export default function CadastroTurmas() {
  return (
    <main className="min-h-screen bg-surfaceVariant p-8">
      <div className="max-w-2xl mx-auto bg-surface p-6 rounded-lg shadow-md border-t-4 border-secondary">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Cadastro de Turmas
        </h1>
        <p className="text-secondary mb-8 text-sm">
          Cadastre as turmas ativas da instituição. Cada aluno poderá ser
          vinculado a apenas uma turma por período letivo.
        </p>

        <form className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Nome da Turma
            </label>
            <input
              type="text"
              placeholder="Ex: 3º Ano A - Foco ENEM"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Ano Letivo
              </label>
              <input
                type="number"
                placeholder="Ex: 2026"
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Turno
              </label>
              <select className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight bg-surface">
                <option value="">Selecione...</option>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="noturno">Noturno</option>
                <option value="integral">Integral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Série
              </label>
              <select className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight bg-surface">
                <option value="">Selecione...</option>
                <option value="1">1º Ano do E.M.</option>
                <option value="2">2º Ano do E.M.</option>
                <option value="3">3º Ano do E.M.</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              className="w-full bg-primary text-surface font-bold py-3 px-4 rounded-md hover:bg-secondary transition duration-300"
            >
              Salvar Nova Turma
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

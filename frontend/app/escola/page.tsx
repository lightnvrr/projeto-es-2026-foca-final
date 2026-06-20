export default function CadastroEscola() {
  return (
    <main className="min-h-screen bg-surfaceVariant p-8">
      <div className="max-w-2xl mx-auto bg-surface p-6 rounded-lg shadow-md border-t-4 border-secondary">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Cadastro Institucional
        </h1>
        <p className="text-secondary mb-8 text-sm">
          Preencha os dados do colégio para inicializar o ambiente de
          monitoramento no Foca.
        </p>

        <form className="space-y-5">
          {/* Linha 1: Razão Social */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Razão Social / Nome da Instituição
            </label>
            <input
              type="text"
              placeholder="Ex: Colégio Foca Ensino Médio Ltda"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

          {/* Linha 2: CNPJ e Telefone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                CNPJ
              </label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                Telefone Principal
              </label>
              <input
                type="text"
                placeholder="(00) 0000-0000"
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
              />
            </div>
          </div>

          {/* Linha 3: E-mail e CEP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                placeholder="direcao@escola.com.br"
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1">
                CEP
              </label>
              <input
                type="text"
                placeholder="00000-000"
                className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
              />
            </div>
          </div>

          {/* Linha 4: Endereço Completo */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              placeholder="Rua, Número, Bairro, Cidade - UF"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight"
            />
          </div>

          {/* Linha 5: Logotipo */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1">
              Logotipo da Instituição
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full p-3 border border-primaryLight rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-onSurfaceLight file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primaryLight file:text-onSurfaceLight hover:file:bg-secondary hover:file:text-surface"
            />
          </div>

          {/* Botão */}
          <div className="pt-4">
            <button
              type="button"
              className="w-full bg-primary text-surface font-bold py-3 px-4 rounded-md hover:bg-secondary transition duration-300"
            >
              Salvar Instituição
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

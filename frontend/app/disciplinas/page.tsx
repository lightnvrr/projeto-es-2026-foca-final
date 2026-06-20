// Disciplinas são uma lista fixa de 12 registros — sem CRUD.
// Gerenciadas pelo seed do backend (removeEscolaAndAdjustDisciplines.md).
// Apenas GET /disciplinas é exposto pela API.

const DISCIPLINAS = [
  "Matemática", "Português", "Ciências", "História", "Geografia",
  "Inglês", "Artes", "Educação Física", "Filosofia", "Sociologia",
  "Física", "Química",
];

export default function Disciplinas() {
  return (
    <main className="min-h-screen bg-surfaceVariant p-8">
      <div className="max-w-2xl mx-auto bg-surface p-6 rounded-lg shadow-md border-t-4 border-secondary">
        <h1 className="text-2xl font-bold text-primary mb-2">Disciplinas</h1>
        <p className="text-secondary mb-6 text-sm">
          Lista de disciplinas disponíveis na plataforma. Gerenciadas pelo sistema.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DISCIPLINAS.map((nome) => (
            <div
              key={nome}
              className="p-3 border border-primaryLight rounded-md text-sm font-medium text-primary bg-surfaceVariant"
            >
              {nome}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

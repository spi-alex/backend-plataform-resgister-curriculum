interface Experience {
  title: string;
  company: string;
  period: string;
  description?: string;
  activities?: string[];
}

const experiences: Experience[] = [
  {
    title: "Estagiária de Engenharia",
    company: "Construart Engenharia S.A.",
    period: "Jan 2023 - Out 2023",
    activities: [
      "Suporte técnico no acompanhamento de cronogramas via MS Project.",
      "Leitura e conferência de projetos estruturais no canteiro de obras.",
      "Auxílio na elaboração de relatórios diários de obra (RDO).",
    ],
  },
  {
    title: "Projeto de Extensão - Urbanismo Social",
    company: "UFMG Laboratório de Urbanismo",
    period: "Ago 2022 - Dez 2022",
    description:
      "Levantamento topográfico e diagnóstico de infraestrutura em comunidades de baixa renda para projetos de saneamento básico.",
  },
];

export default function CurriculumExperience() {
  return (
    <section className="bg-white rounded-xl p-8 border">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">
          business_center
        </span>
        Experiências e Projetos
      </h3>

      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div
            key={index}
            className="relative pl-8 before:content-[''] before:absolute before:left-1 before:top-1 before:bottom-0 before:w-px before:bg-gray-200"
          >
            {/* marcador */}
            <span className="absolute left-0 top-1 size-3 rounded-full bg-primary ring-4 ring-primary/20" />

            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-gray-900">
                {exp.title}
              </h4>
              <span className="text-xs text-gray-500">
                {exp.period}
              </span>
            </div>

            <p className="text-sm font-semibold text-primary mb-2">
              {exp.company}
            </p>

            {exp.activities && (
              <ul className="list-disc pl-4 space-y-1 text-sm text-gray-600">
                {exp.activities.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {exp.description && (
              <p className="text-sm text-gray-600">
                {exp.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

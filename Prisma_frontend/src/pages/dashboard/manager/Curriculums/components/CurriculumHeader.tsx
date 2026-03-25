interface Props {
  data: {
    name: string;
    role: string;
    location: string;
    type: string;
  };
}

export default function CurriculumHeader({ data }: Props) {
  return (
    <section className="bg-white rounded-xl p-6 border">
      <div className="flex justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-3xl font-bold">{data.name}</h2>
          <p className="text-green-600">{data.role}</p>
          <p className="text-sm text-gray-500">{data.location}</p>
        </div>

        <div className="flex gap-2">
          <button className="btn-outline">Imprimir</button>
          <button className="btn-outline">Baixar PDF</button>
          <button className="btn-primary">Entrar em contato</button>
        </div>
      </div>
    </section>
  );
}

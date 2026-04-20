export default function CurriculumSidebar() {
  return (
    <aside className="space-y-8">
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="text-sm font-bold uppercase mb-4">
          Contato
        </h4>

        <p className="text-sm">m.luiza@email.com</p>
        <p className="text-sm">(31) 98877-6655</p>
      </div>

      <div className="bg-white rounded-xl p-6 border">
        <h4 className="text-sm font-bold uppercase mb-4">
          Habilidades
        </h4>

        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold">AutoCAD</span>
            <div className="h-2 bg-gray-200 rounded">
              <div className="h-full bg-primary rounded w-[90%]" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

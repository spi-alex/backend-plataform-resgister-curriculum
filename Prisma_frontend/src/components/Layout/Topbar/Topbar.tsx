export default function Topbar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" />
        <div>
          PRISMA
          <small
            style={{
              display: "block",
              fontSize: ".78rem",
              opacity: 0.9,
            }}
          >
            Sistema de Currículos Acadêmicos
          </small>
        </div>
      </div>

      <div className="user-chip">
        Olá, aniafehts
      </div>
    </header>
  );
}

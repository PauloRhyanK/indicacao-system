export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>CAIS Confidencial — Erro</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { font: 15px/1.5 system-ui, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; background: #111; color: #fff; border: none; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Não foi possível carregar esta página</h1>
      <p>Algo deu errado. Tente atualizar.</p>
      <button onclick="location.reload()">Tentar novamente</button>
    </div>
  </body>
</html>`;
}

// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const main = readFileSync(join(raiz, 'src/main.jsx'), 'utf8');

const CONDICION = "if (import.meta.env.DEV && import.meta.env.VITE_MODO_DEMO === 'true') {";

// Devuelve el cuerpo del bloque `{ ... }` que abre en `inicio` (índice de la llave).
function cuerpoDelBloque(fuente, inicio) {
  let profundidad = 0;
  for (let i = inicio; i < fuente.length; i += 1) {
    if (fuente[i] === '{') profundidad += 1;
    if (fuente[i] === '}') {
      profundidad -= 1;
      if (profundidad === 0) return fuente.slice(inicio + 1, i);
    }
  }
  throw new Error('Bloque sin cerrar');
}

describe('modo demo fuera del build de producción', () => {
  it('main.jsx solo importa ./demo/ dentro de la condición import.meta.env.DEV', () => {
    const posicion = main.indexOf(CONDICION);
    expect(posicion).toBeGreaterThanOrEqual(0);

    const bloque = cuerpoDelBloque(main, posicion + CONDICION.length - 1);
    expect(bloque).toMatch(/await import\(['"]\.\/demo\/instalarDemo\.js['"]\)/);

    const fuera = main.replace(bloque, '');
    expect(fuera).not.toMatch(/\.\/demo\//);
  });

  it('main.jsx no tiene imports estáticos de ./demo/', () => {
    expect(main).not.toMatch(/^\s*import\s[^(]*['"]\.\/demo\//m);
  });

  it('ningún otro archivo de src/ fuera de src/demo importa el módulo demo', () => {
    const archivos = [];
    const recorrer = (carpeta) => {
      for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
        const ruta = join(carpeta, entrada.name);
        if (entrada.isDirectory()) {
          if (entrada.name !== 'demo') recorrer(ruta);
        } else if (/\.(jsx?|tsx?)$/.test(entrada.name) && !ruta.endsWith(join('src', 'main.jsx'))) {
          archivos.push(ruta);
        }
      }
    };
    recorrer(join(raiz, 'src'));
    for (const archivo of archivos) {
      expect(readFileSync(archivo, 'utf8'), archivo).not.toMatch(/['"][./]*demo\//);
    }
  });
});

describe('build de producción real', () => {
  it(
    'aunque VITE_MODO_DEMO sea "true", ningún JS emitido trae cagappDemo ni instalarDemo',
    async () => {
      const { build } = await import('vite');
      const outDir = mkdtempSync(join(tmpdir(), 'cagapp-build-demo-'));
      const previo = {
        modo: process.env.VITE_MODO_DEMO,
        api: process.env.VITE_API_URL,
        nodeEnv: process.env.NODE_ENV,
      };
      // Vitest corre con NODE_ENV=test, y con eso Vite deja DEV=true aun en
      // build; `npm run build` corre con NODE_ENV sin definir → producción.
      process.env.NODE_ENV = 'production';
      process.env.VITE_MODO_DEMO = 'true';
      process.env.VITE_API_URL = 'http://demo.local';
      try {
        await build({
          root: raiz,
          mode: 'production',
          logLevel: 'silent',
          build: { outDir, emptyOutDir: true },
        });

        const archivosJs = [];
        const recorrer = (carpeta) => {
          for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
            const ruta = join(carpeta, entrada.name);
            if (entrada.isDirectory()) recorrer(ruta);
            else if (/\.m?js$/.test(entrada.name)) archivosJs.push(ruta);
          }
        };
        recorrer(outDir);

        expect(archivosJs.length).toBeGreaterThan(0);
        for (const archivo of archivosJs) {
          const contenido = readFileSync(archivo, 'utf8');
          expect(contenido, archivo).not.toContain('cagappDemo');
          expect(contenido, archivo).not.toContain('instalarDemo');
        }
      } finally {
        process.env.NODE_ENV = previo.nodeEnv;
        if (previo.modo === undefined) delete process.env.VITE_MODO_DEMO;
        else process.env.VITE_MODO_DEMO = previo.modo;
        if (previo.api === undefined) delete process.env.VITE_API_URL;
        else process.env.VITE_API_URL = previo.api;
        rmSync(outDir, { recursive: true, force: true });
      }
    },
    120000
  );
});

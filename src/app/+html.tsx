import { useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

import { Colores } from "@/constants/theme";

// Web (export estático): HTML de todas las páginas. Solo se ejecuta en Node al
// exportar. En SDK 58 hay que pintar headNodes (estilos de react-native-web) y
// bodyNodes (los scripts) o la página no carga.
// noindex: los enlaces de invitación no deben aparecer en buscadores.
// no-referrer: la URL con el token no se envía a ningún otro sitio.
// PWA (Safari → Compartir → Añadir a pantalla de inicio): manifest, icono de
// Apple y modo standalone. Sin service worker: la app necesita conexión.
// viewport-fit=cover: la app recibe las zonas seguras del iPhone
// (env(safe-area-inset-*), que lee react-native-safe-area-context).
// status-bar-style black: barra de estado opaca, el contenido empieza debajo.
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
        <title>MI Banda</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content={Colores.background} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MI Banda" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        {/* La app ocupa la pantalla y solo hacen scroll sus ScrollView (sin doble
            scroll). Como ScrollViewStyleReset de Expo Router, más 100dvh (alto
            real con las barras de Safari) y el fondo oscuro detrás de todo. */}
        <style id="mibanda-raiz" dangerouslySetInnerHTML={{ __html: ESTILO_RAIZ }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

const ESTILO_RAIZ =
  "html,body,#root{height:100%}" +
  `html,body{background-color:${Colores.background}}` +
  "body{overflow:hidden;overscroll-behavior:none}" +
  "#root{display:flex;height:100dvh}";

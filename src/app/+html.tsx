import { useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Web (export estático): HTML de la página de respaldo de las invitaciones.
// Solo se ejecuta en Node al exportar. En SDK 58 hay que pintar headNodes
// (estilos de react-native-web) y bodyNodes (los scripts) o la página no carga.
// noindex: los enlaces de invitación no deben aparecer en buscadores.
// no-referrer: la URL con el token no se envía a ningún otro sitio.
// Sin ScrollViewStyleReset: en un móvil pequeño la página tiene que poder hacer scroll.
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
        <title>MI Banda</title>
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

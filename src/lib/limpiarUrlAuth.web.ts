// Web: tras leer el enlace de confirmación o de recuperación, sus tokens
// (#access_token=… o ?code=…) se quitan de la barra de direcciones y del
// historial. Hace falta aquí porque, durante la recuperación, la pantalla de
// nueva contraseña se ve antes de que la ruta /auth/callback (y su Redirect) se
// monte. Se mantiene la ruta: el router no cambia de pantalla.
export function limpiarUrlAuth(): void {
  if (typeof window === "undefined") {
    return;
  }

  const { pathname, search, hash } = window.location;

  if (search !== "" || hash !== "") {
    window.history.replaceState(window.history.state, "", pathname);
  }
}

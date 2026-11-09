import { esEnlaceGoogleMapsValido, normalizarEnlaceGoogleMaps } from "../googleMaps";

describe("esEnlaceGoogleMapsValido", () => {
  test("vacío es válido: el enlace es opcional", () => {
    expect(esEnlaceGoogleMapsValido("")).toBe(true);
    expect(esEnlaceGoogleMapsValido("   ")).toBe(true);
  });

  test.each([
    "https://maps.app.goo.gl/AbCdEf123",
    "https://maps.app.goo.gl/AbCdEf123?g_st=iw",
    "https://www.google.com/maps/place/Caseta+Municipal/@37.58,-4.63,17z",
    "https://www.google.com/maps?q=37.58,-4.63",
    "https://www.google.com/maps",
    "https://google.com/maps/dir/Córdoba/Montilla",
    "https://maps.google.com/?q=Montilla",
    "https://maps.google.com",
    "https://www.google.es/maps/place/Montilla",
    "https://maps.google.es/maps?q=Montilla",
    "https://goo.gl/maps/AbCdEf123",
    "  https://maps.app.goo.gl/AbCdEf123  ",
    "HTTPS://MAPS.APP.GOO.GL/AbCdEf123",
  ])("acepta %s", (enlace) => {
    expect(esEnlaceGoogleMapsValido(enlace)).toBe(true);
  });

  test.each([
    ["http", "http://maps.google.com/?q=Montilla"],
    ["javascript", "javascript:alert(1)"],
    ["javascript con barras", "javascript://maps.google.com/%0Aalert(1)"],
    ["file", "file:///storage/emulated/0/mapa.html"],
    ["intent", "intent://maps.google.com/#Intent;scheme=https;end"],
    ["sin esquema", "maps.app.goo.gl/AbCdEf123"],
    ["mal formada", "https://"],
    ["mal formada con espacio", "https://maps.app.goo.gl/Ab Cd"],
    ["dominio ajeno", "https://ejemplo.com"],
    ["dominio ajeno con la palabra google", "https://ejemplo.com/google/maps"],
    ["dominio que empieza por google.com", "https://google.com.ejemplo.com/maps"],
    ["dominio que acaba en google.com", "https://notgoogle.com/maps"],
    ["subdominio falso de maps.google.com", "https://maps.google.com.ejemplo.com/"],
    ["usuario que disfraza el destino", "https://google.com@ejemplo.com/maps"],
    ["usuario que disfraza el destino de un enlace corto", "https://maps.app.goo.gl@ejemplo.com/x"],
    ["barra invertida", "https://maps.app.goo.gl\\@ejemplo.com/x"],
    ["puerto", "https://maps.google.com:8443/maps"],
    ["google.com sin /maps", "https://www.google.com/search?q=Montilla"],
    ["ruta que solo empieza por maps", "https://www.google.com/mapsfalso"],
    ["goo.gl sin /maps", "https://goo.gl/AbCdEf"],
    ["más de 2048 caracteres", `https://maps.app.goo.gl/${"a".repeat(2030)}`],
  ])("rechaza %s", (_motivo, enlace) => {
    expect(esEnlaceGoogleMapsValido(enlace)).toBe(false);
  });
});

describe("normalizarEnlaceGoogleMaps", () => {
  test("vacío o solo espacios es null", () => {
    expect(normalizarEnlaceGoogleMaps("")).toBeNull();
    expect(normalizarEnlaceGoogleMaps("   ")).toBeNull();
  });

  test("recorta y conserva el enlace tal cual, sin parámetros nuevos", () => {
    const enlace = "https://maps.app.goo.gl/AbCdEf123?g_st=iw";

    expect(normalizarEnlaceGoogleMaps(`  ${enlace}\n`)).toBe(enlace);
  });
});

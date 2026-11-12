import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton, BackHandler, Platform, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { CabeceraConLogo } from "../../components/LogoBanda";
import { DURACION_CONFIRMACION_LOGO, PantallaLogoBanda } from "../../components/PantallaLogoBanda";
import { useBandaContext } from "../../context/BandaContext";
import { LogoBandaProvider, TAMANO_MAXIMO_LOGO, useLogoBandaContext } from "../../context/LogoBandaContext";
import type { CambioLogo, DatosLogo } from "../../services/supabase/logoBanda";

// Proveedor y pantallas reales: se simulan la banda, el repositorio (Supabase
// Storage), la lectura del archivo y el selector de fotos del sistema.

jest.mock("../../global.css", () => ({}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: "compatible" },
}));

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return { BotonCerrarSesion: () => <Text>Cerrar sesión</Text> };
});

const mockLeerBytes = jest.fn<Promise<ArrayBuffer>, [string]>();

jest.mock("../../services/archivos", () => ({
  leerBytesArchivo: (uri: string) => mockLeerBytes(uri),
}));

const mockObtener = jest.fn<Promise<DatosLogo>, [string]>();
const mockGuardar = jest.fn<Promise<DatosLogo>, [string, CambioLogo, string | null]>();
const mockQuitar = jest.fn<Promise<void>, [string, string | null]>();

jest.mock("../../services/supabase/logoBanda", () => ({
  crearRepositorioLogoBandaSupabase: (bandaId: string) => ({
    obtener: () => mockObtener(bandaId),
    urlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
    guardar: (cambio: CambioLogo, anterior: string | null) => mockGuardar(bandaId, cambio, anterior),
    quitar: (anterior: string | null) => mockQuitar(bandaId, anterior),
  }),
}));

const mockUseBandaContext = jest.mocked(useBandaContext);
const mockElegir = jest.mocked(ImagePicker.launchImageLibraryAsync);

// Firma de un PNG: los bytes que se leen del archivo y deben llegar intactos
const BYTES_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
const GUARDADO: DatosLogo = { ruta: "b1/logo-1.png", escala: 1.7 };
const SIN_LOGO: DatosLogo = { ruta: null, escala: 1 };

function simular({ esAdmin = true, bandaId = "b1", nombre = "Rockabanda" } = {}) {
  mockUseBandaContext.mockReturnValue({
    bandaActual: { id: bandaId, nombre },
    esAdmin,
  } as unknown as ReturnType<typeof useBandaContext>);
}

function Portada() {
  const { url, escala } = useLogoBandaContext();

  return <CabeceraConLogo titulo="Calendario" nombreBanda="Rockabanda" logoUrl={url} escala={escala} />;
}

function conProveedor(hijo: React.ReactElement) {
  return <LogoBandaProvider>{hijo}</LogoBandaProvider>;
}

type Resultado = Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>;

function elegida(asset: { uri: string; mimeType?: string; fileName?: string } | null): Resultado {
  return asset === null
    ? { canceled: true, assets: null }
    : ({ canceled: false, assets: [{ width: 1200, height: 400, ...asset }] } as Resultado);
}

const PNG_TRANSPARENTE = { uri: "file:///cache/nuevo.png", mimeType: "image/png", fileName: "nuevo.png" };

function estilo(elemento: { props: { style?: unknown } } | null | undefined) {
  return StyleSheet.flatten(elemento?.props.style as Parameters<typeof StyleSheet.flatten>[0]) ?? {};
}

// expo-image normaliza source a una lista en el elemento nativo
function uriLogo(): string | undefined {
  const fuente = screen.getByTestId("imagen-logo-banda").props.source as { uri: string } | { uri: string }[];

  return (Array.isArray(fuente) ? fuente[0] : fuente)?.uri;
}

function escalaImagen(): number {
  const transform = estilo(screen.getByTestId("imagen-logo-banda")).transform as { scale?: number }[] | undefined;

  return transform?.find((paso) => paso.scale !== undefined)?.scale ?? 1;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockObtener.mockResolvedValue(SIN_LOGO);
  mockLeerBytes.mockResolvedValue(BYTES_PNG);
  mockGuardar.mockImplementation(async (_banda, cambio, anterior) => ({
    ruta: cambio.imagen ? "b1/logo-2.png" : anterior,
    escala: cambio.escala,
  }));
  mockQuitar.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("logo en la portada", () => {
  async function conLogo(datos: DatosLogo = GUARDADO) {
    simular();
    mockObtener.mockResolvedValue(datos);
    await render(conProveedor(<Portada />));

    return screen.findByRole("image", { name: "Logo de Rockabanda" });
  }

  test("arriba, a todo el ancho y, debajo, solo el título (sin el nombre de la banda)", async () => {
    const logo = await conLogo({ ruta: "b1/logo-1.png", escala: 1 });
    const renderizado = JSON.stringify(screen.toJSON());

    expect(screen.getByText("Calendario")).toBeTruthy();
    // El logo ya identifica a la banda: su nombre no se repite como subtítulo
    expect(screen.queryByText("Rockabanda")).toBeNull();
    // pero sigue siendo la etiqueta accesible del logo
    expect(logo).toBeTruthy();
    expect(renderizado.indexOf("Logo de Rockabanda")).toBeLessThan(renderizado.indexOf('"Calendario"'));
    expect(estilo(logo).width).toBe("100%");
  });

  test("manda el ancho: sin alto máximo que encoja un logo horizontal", async () => {
    const logo = await conLogo({ ruta: "b1/logo-1.png", escala: 1 });

    await fireEvent(screen.getByTestId("imagen-logo-banda"), "load", {
      nativeEvent: { source: { width: 1200, height: 300, url: "https://cdn.test/b1/logo-1.png" } },
    });

    expect(estilo(logo).maxHeight).toBeUndefined();
    expect(estilo(screen.getByTestId("logo-banda"))).toMatchObject({ width: "100%", aspectRatio: 4 });
  });

  test("un logo muy vertical no pasa de un cuadrado", async () => {
    await conLogo({ ruta: "b1/logo-1.png", escala: 1 });

    await fireEvent(screen.getByTestId("imagen-logo-banda"), "load", {
      nativeEvent: { source: { width: 300, height: 1200, url: "https://cdn.test/b1/logo-1.png" } },
    });

    expect(estilo(screen.getByTestId("logo-banda")).aspectRatio).toBe(1);
  });

  test("entero, sin deformar, sin caja ni fondo: contain y transparencia sobre el fondo de la app", async () => {
    const logo = await conLogo();

    expect(screen.getByTestId("imagen-logo-banda").props.contentFit).toBe("contain");
    expect(estilo(logo).backgroundColor).toBeUndefined();
    expect(estilo(logo).borderWidth).toBeUndefined();
    expect(estilo(logo).shadowColor).toBeUndefined();
    // Al ampliar, lo que se sale de la zona no se ve
    expect(estilo(logo).overflow).toBe("hidden");
  });

  test("aplica la escala guardada de la banda al ampliar", async () => {
    const logo = await conLogo({ ruta: "b1/logo-1.png", escala: 1.7 });

    expect(escalaImagen()).toBe(1.7);
    expect(estilo(logo).width).toBe("100%");
  });

  test("y al reducir: la zona se estrecha, centrada, sin hueco alrededor", async () => {
    const logo = await conLogo({ ruta: "b1/logo-1.png", escala: 0.8 });

    expect(estilo(logo)).toMatchObject({ width: "80%", alignSelf: "center" });
    expect(escalaImagen()).toBe(1);
  });

  test("sin logo, solo el título, arriba, sin hueco y sin el nombre de la banda", async () => {
    simular();
    await render(conProveedor(<Portada />));

    await act(async () => {});

    expect(screen.queryByTestId("logo-banda")).toBeNull();
    expect(screen.queryByText("Sin logo")).toBeNull();
    expect(screen.getByRole("header", { name: "Calendario" })).toBeTruthy();
    expect(screen.queryByText("Rockabanda")).toBeNull();
  });

  test("si no se puede leer, sigue sin logo y sin error", async () => {
    simular();
    mockObtener.mockRejectedValue(new Error("column logo_path does not exist"));
    await render(conProveedor(<Portada />));

    await act(async () => {});

    expect(screen.queryByTestId("logo-banda")).toBeNull();
    expect(screen.getByText("Calendario")).toBeTruthy();
  });

  test("al cambiar de banda no se queda el logo de la anterior", async () => {
    simular();
    // La banda nueva todavía no ha respondido: mientras tanto, nada de la anterior
    mockObtener.mockImplementation((bandaId) =>
      bandaId === "b1" ? Promise.resolve(GUARDADO) : new Promise<DatosLogo>(() => {})
    );
    const { rerender } = await render(conProveedor(<Portada />));
    await screen.findByTestId("logo-banda");

    simular({ bandaId: "b2", nombre: "Otra" });
    await rerender(conProveedor(<Portada />));
    await act(async () => {});

    expect(screen.queryByTestId("logo-banda")).toBeNull();
    expect(mockObtener).toHaveBeenLastCalledWith("b2");
  });
});

describe("editor del logo (admin)", () => {
  async function abrir({ datos = SIN_LOGO, onVolver = jest.fn(), enFoco = true } = {}) {
    simular();
    mockObtener.mockResolvedValue(datos);
    await render(conProveedor(<PantallaLogoBanda nombreBanda="Rockabanda" enFoco={enFoco} onVolver={onVolver} />));
    await act(async () => {});

    return onVolver;
  }

  // Con logo, Editar; sin logo, Añadir logo
  async function editar() {
    await fireEvent.press(screen.getByRole("button", { name: /^(Editar|Añadir logo)$/ }));
  }

  async function abrirEditando(opciones: Parameters<typeof abrir>[0] = {}) {
    const onVolver = await abrir(opciones);
    await editar();

    return onVolver;
  }

  async function elegirPng() {
    mockElegir.mockResolvedValue(elegida(PNG_TRANSPARENTE));
    await fireEvent.press(screen.getByRole("button", { name: /^Elegir/ }));
  }

  // Atrás de Android: se pulsa el último manejador registrado (el vigente)
  type Manejador = Parameters<typeof BackHandler.addEventListener>[1];

  function simularAtras() {
    const manejadores: Manejador[] = [];
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_evento, manejador) => {
      manejadores.push(manejador);
      return {
        remove: () => {
          manejadores.splice(manejadores.indexOf(manejador), 1);
        },
      };
    });

    return async () => {
      let interceptado = false;
      await act(async () => {
        interceptado = manejadores[manejadores.length - 1]?.({} as Parameters<Manejador>[0]) === true;
      });

      return interceptado;
    };
  }

  const guardar = () => screen.getByRole("button", { name: /^(Guardar|Guardando\.\.\.)$/ });
  const valorEscala = () => screen.getByLabelText("Tamaño del logo").props.accessibilityValue.text;
  const CONFIRMACION = "✓ Logo guardado correctamente";

  // Lo que solo existe editando
  function controlesDeEdicion() {
    return [
      screen.queryByLabelText("Tamaño del logo"),
      screen.queryByRole("button", { name: "Reducir tamaño" }),
      screen.queryByRole("button", { name: "Aumentar tamaño" }),
      screen.queryByRole("button", { name: /^Elegir/ }),
      screen.queryByRole("button", { name: /^(Guardar|Guardando\.\.\.)$/ }),
      screen.queryByRole("button", { name: "Cancelar" }),
    ].filter((control) => control !== null);
  }

  describe("modo consulta", () => {
    test("con logo, se entra consultando: logo, tamaño actual, Editar y Quitar logo", async () => {
      await abrir({ datos: GUARDADO });

      expect(uriLogo()).toBe("https://cdn.test/b1/logo-1.png");
      expect(escalaImagen()).toBe(1.7);
      expect(screen.getByText("Tamaño actual")).toBeTruthy();
      expect(screen.getByText("170 %")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Quitar logo" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Volver a Banda" })).toBeTruthy();
    });

    test("sin controles de edición: ni − / +, ni elegir imagen, ni Guardar", async () => {
      await abrir({ datos: GUARDADO });

      expect(controlesDeEdicion()).toEqual([]);
      expect(screen.queryByText("−")).toBeNull();
      expect(screen.queryByText("+")).toBeNull();
    });

    test("sin logo: hueco y Añadir logo, sin Editar ni Quitar", async () => {
      await abrir();

      expect(screen.getByText("Sin logo")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Añadir logo" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
      expect(screen.queryByText("Quitar logo")).toBeNull();
      expect(screen.queryByText("Tamaño actual")).toBeNull();
      expect(controlesDeEdicion()).toEqual([]);
    });

    test("Añadir logo entra en edición sin subir nada", async () => {
      await abrir();

      await editar();

      expect(screen.getByRole("button", { name: "Elegir imagen" })).toBeTruthy();
      expect(guardar().props.accessibilityState.disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
      expect(mockElegir).not.toHaveBeenCalled();
      expect(mockGuardar).not.toHaveBeenCalled();
    });
  });

  describe("modo edición", () => {
    test("Editar muestra los controles, Guardar (desactivado sin cambios) y Cancelar", async () => {
      await abrir({ datos: GUARDADO });

      await editar();

      expect(valorEscala()).toBe("170 %");
      expect(screen.getByRole("button", { name: "Elegir otra imagen" })).toBeTruthy();
      expect(guardar().props.accessibilityState.disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
      // Editando no se quita ni se sale por otro botón: Cancelar es la salida
      expect(screen.queryByText("Quitar logo")).toBeNull();
      expect(screen.queryByText("Volver a Banda")).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    });

    test("el selector no recorta ni recomprime ni pide base64 (que sería JPEG)", async () => {
      await abrirEditando();
      await elegirPng();

      const opciones = mockElegir.mock.calls[0][0];
      expect(opciones).toMatchObject({ mediaTypes: ["images"], allowsEditing: false, quality: 1, base64: false });
      expect(opciones).not.toHaveProperty("aspect");
    });

    test("elegir una imagen solo la previsualiza: no se lee ni se sube nada", async () => {
      await abrirEditando();
      await elegirPng();

      expect(uriLogo()).toBe("file:///cache/nuevo.png");
      expect(mockLeerBytes).not.toHaveBeenCalled();
      expect(mockGuardar).not.toHaveBeenCalled();
      expect(guardar().props.accessibilityState.disabled).toBe(false);
      // Sigue editando hasta Guardar
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    });

    test("una imagen nueva empieza a tamaño normal", async () => {
      await abrirEditando({ datos: GUARDADO });
      await elegirPng();

      expect(valorEscala()).toBe("100 %");
    });

    test("tamaño mínimo 50 %: − se desactiva y no baja de ahí", async () => {
      await abrirEditando({ datos: { ruta: "b1/logo-1.png", escala: 0.6 } });

      await fireEvent.press(screen.getByRole("button", { name: "Reducir tamaño" }));
      expect(valorEscala()).toBe("50 %");
      expect(screen.getByRole("button", { name: "Reducir tamaño" }).props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(screen.getByRole("button", { name: "Reducir tamaño" }));
      expect(valorEscala()).toBe("50 %");
    });

    test("tamaño máximo 250 %: + se desactiva y no sube de ahí", async () => {
      await abrirEditando({ datos: { ruta: "b1/logo-1.png", escala: 2.4 } });

      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      expect(valorEscala()).toBe("250 %");
      expect(screen.getByRole("button", { name: "Aumentar tamaño" }).props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      expect(valorEscala()).toBe("250 %");
    });

    test("el lector de pantalla puede subir y bajar el tamaño", async () => {
      await abrirEditando({ datos: GUARDADO });
      const control = screen.getByLabelText("Tamaño del logo");

      expect(control.props.accessibilityRole).toBe("adjustable");
      await fireEvent(control, "accessibilityAction", { nativeEvent: { actionName: "increment" } });

      expect(valorEscala()).toBe("180 %");
    });

    test("cancelar el selector no cambia nada", async () => {
      await abrirEditando({ datos: GUARDADO });
      mockElegir.mockResolvedValue(elegida(null));

      await fireEvent.press(screen.getByRole("button", { name: "Elegir otra imagen" }));

      expect(guardar().props.accessibilityState.disabled).toBe(true);
      expect(uriLogo()).toBe("https://cdn.test/b1/logo-1.png");
    });
  });

  describe("Guardar", () => {
    test("muestra Guardando... mientras dura y vuelve a consultar con la confirmación", async () => {
      let terminar: (datos: DatosLogo) => void = () => {};
      mockGuardar.mockReturnValue(
        new Promise((resolver) => {
          terminar = resolver;
        })
      );
      await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));

      await fireEvent.press(guardar());

      expect(screen.getByRole("button", { name: "Guardando..." }).props.accessibilityState.disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Cancelar" }).props.accessibilityState.disabled).toBe(true);
      expect(screen.queryByText(CONFIRMACION)).toBeNull();

      await act(async () => {
        terminar({ ruta: "b1/logo-1.png", escala: 1.8 });
      });

      // De vuelta en consulta, con lo recién guardado y el aviso a la vista
      expect(controlesDeEdicion()).toEqual([]);
      expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
      expect(screen.getByText("180 %")).toBeTruthy();
      // Se anuncia (alerta con región viva), sin quitar el foco a nadie
      let aviso: ReturnType<typeof screen.getByText> | null = screen.getByText(CONFIRMACION);
      while (aviso !== null && aviso.props.accessibilityRole !== "alert") {
        aviso = aviso.parent;
      }
      expect(aviso?.props.accessibilityLiveRegion).toBe("polite");
    });

    test("sube el PNG tal cual (image/png, mismos bytes) junto con la escala elegida", async () => {
      await abrirEditando();
      await elegirPng();
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));

      await fireEvent.press(guardar());

      expect(mockLeerBytes).toHaveBeenCalledWith("file:///cache/nuevo.png");
      expect(mockGuardar).toHaveBeenCalledTimes(1);
      expect(mockGuardar).toHaveBeenCalledWith("b1", { imagen: { bytes: BYTES_PNG, mime: "image/png" }, escala: 1.2 }, null);
      // Guardado: sin borrador, se ve el resultado definitivo, consultando
      expect(await screen.findByText(CONFIRMACION)).toBeTruthy();
      expect(uriLogo()).toBe("https://cdn.test/b1/logo-2.png");
      expect(screen.getByText("120 %")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Quitar logo" })).toBeTruthy();
    });

    test.each([
      [{ uri: "file:///cache/foto.jpg", mimeType: "image/jpeg" }, "image/jpeg"],
      [{ uri: "file:///cache/logo.webp", mimeType: "image/webp" }, "image/webp"],
    ])("JPEG y WebP también se guardan con su tipo (%p)", async (asset, mime) => {
      await abrirEditando();
      mockElegir.mockResolvedValue(elegida(asset));
      await fireEvent.press(screen.getByRole("button", { name: "Elegir imagen" }));

      await fireEvent.press(guardar());

      expect(mockGuardar.mock.calls[0][1]).toMatchObject({ imagen: { mime } });
    });

    test("cambiar solo el tamaño guarda solo la escala, sin volver a subir la imagen", async () => {
      await abrirEditando({ datos: GUARDADO });

      await fireEvent.press(screen.getByRole("button", { name: "Reducir tamaño" }));
      expect(valorEscala()).toBe("160 %");
      // La vista previa ya enseña el tamaño nuevo
      expect(escalaImagen()).toBe(1.6);

      await fireEvent.press(guardar());

      expect(mockGuardar).toHaveBeenCalledWith("b1", { escala: 1.6 }, "b1/logo-1.png");
      expect(mockGuardar.mock.calls[0][1]).not.toHaveProperty("imagen");
      expect(mockLeerBytes).not.toHaveBeenCalled();
      expect(await screen.findByText(CONFIRMACION)).toBeTruthy();
      expect(screen.getByText("160 %")).toBeTruthy();
      expect(controlesDeEdicion()).toEqual([]);
    });

    test("la confirmación se retira sola al rato (solo es un aviso)", async () => {
      jest.useFakeTimers();

      try {
        await abrirEditando({ datos: GUARDADO });
        await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
        await fireEvent.press(guardar());
        expect(screen.getByText(CONFIRMACION)).toBeTruthy();

        await act(async () => {
          jest.advanceTimersByTime(DURACION_CONFIRMACION_LOGO);
        });

        expect(screen.queryByText(CONFIRMACION)).toBeNull();
        // Lo guardado sigue igual
        expect(screen.getByText("180 %")).toBeTruthy();
      } finally {
        jest.useRealTimers();
      }
    });

    test("volver a Editar retira la confirmación anterior", async () => {
      await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      await fireEvent.press(guardar());
      expect(await screen.findByText(CONFIRMACION)).toBeTruthy();

      await editar();

      expect(screen.queryByText(CONFIRMACION)).toBeNull();
    });

    test("dos toques seguidos en Guardar no duplican la operación", async () => {
      let terminar: (datos: DatosLogo) => void = () => {};
      mockGuardar.mockReturnValue(
        new Promise((resolver) => {
          terminar = resolver;
        })
      );
      await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));

      await fireEvent.press(guardar());
      expect(screen.getByRole("button", { name: "Guardando..." }).props.accessibilityState.disabled).toBe(true);
      await fireEvent.press(guardar());

      expect(mockGuardar).toHaveBeenCalledTimes(1);

      await act(async () => {
        terminar({ ruta: "b1/logo-1.png", escala: 1.8 });
      });
    });

    test("aunque lleguen dos Guardar antes de repintar, solo hay una operación", async () => {
      let terminar: (datos: DatosLogo) => void = () => {};
      mockGuardar.mockReturnValue(
        new Promise((resolver) => {
          terminar = resolver;
        })
      );
      simular();
      mockObtener.mockResolvedValue(GUARDADO);
      let contexto: ReturnType<typeof useLogoBandaContext> | null = null;

      function Espia() {
        contexto = useLogoBandaContext();
        return null;
      }

      await render(conProveedor(<Espia />));
      await act(async () => {});

      let segunda: boolean | null = null;

      await act(async () => {
        if (contexto === null) {
          throw new Error("Falta el contexto");
        }

        // Las dos en el mismo instante, con el mismo contexto
        const primera = contexto.guardarLogo({ escala: 2 });
        segunda = await contexto.guardarLogo({ escala: 2 });
        terminar({ ruta: "b1/logo-1.png", escala: 2 });
        await primera;
      });

      expect(segunda).toBe(false);
      expect(mockGuardar).toHaveBeenCalledTimes(1);
    });
  });

  describe("error al guardar", () => {
    test("se sigue editando con el borrador, sin éxito, y se puede reintentar", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockGuardar.mockRejectedValueOnce(new Error("fallo"));
      await abrirEditando({ datos: GUARDADO });
      await elegirPng();

      await fireEvent.press(guardar());

      expect(await screen.findByText("No se ha podido guardar el logo")).toBeTruthy();
      expect(screen.queryByText(CONFIRMACION)).toBeNull();
      // Sigue editando: el borrador sigue ahí para reintentar
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
      expect(uriLogo()).toBe("file:///cache/nuevo.png");
      expect(guardar().props.accessibilityState.disabled).toBe(false);

      await fireEvent.press(guardar());

      expect(mockGuardar).toHaveBeenCalledTimes(2);
      expect(await screen.findByText(CONFIRMACION)).toBeTruthy();
      expect(screen.queryByText("No se ha podido guardar el logo")).toBeNull();
    });

    test("un fallo al guardar no cambia el logo de la portada", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockGuardar.mockRejectedValue(new Error("fallo"));
      simular();
      mockObtener.mockResolvedValue(GUARDADO);
      await render(
        conProveedor(
          <>
            <Portada />
            <PantallaLogoBanda nombreBanda="Rockabanda" enFoco onVolver={jest.fn()} />
          </>
        )
      );
      await act(async () => {});
      await editar();
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));

      await fireEvent.press(guardar());
      await screen.findByText("No se ha podido guardar el logo");

      // La portada (primer logo) sigue con la escala guardada
      const transform = estilo(screen.getAllByTestId("imagen-logo-banda")[0]).transform as { scale: number }[];
      expect(transform[0].scale).toBe(1.7);
    });

    test("formato no admitido (HEIC) o de más de 2 MB: se explica al guardar y no se sube", async () => {
      await abrirEditando();
      mockElegir.mockResolvedValue(elegida({ uri: "file:///cache/foto.heic", mimeType: "image/heic" }));
      await fireEvent.press(screen.getByRole("button", { name: "Elegir imagen" }));
      await fireEvent.press(guardar());

      expect(screen.getByText("Formato no admitido: elige una imagen PNG, JPG o WebP")).toBeTruthy();

      mockLeerBytes.mockResolvedValue(new ArrayBuffer(TAMANO_MAXIMO_LOGO + 1));
      await elegirPng();
      await fireEvent.press(guardar());

      expect(screen.getByText("La imagen es demasiado grande: el máximo son 2 MB")).toBeTruthy();
      expect(mockGuardar).not.toHaveBeenCalled();
      expect(screen.queryByText(CONFIRMACION)).toBeNull();
    });
  });

  describe("Cancelar", () => {
    test("sin cambios vuelve a consultar sin preguntar", async () => {
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const onVolver = await abrirEditando({ datos: GUARDADO });

      await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

      expect(alerta).not.toHaveBeenCalled();
      expect(controlesDeEdicion()).toEqual([]);
      expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
      expect(onVolver).not.toHaveBeenCalled();
    });

    test("con cambios avisa: Seguir editando se queda; Descartar restaura imagen y escala sin tocar Supabase", async () => {
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const onVolver = await abrirEditando({ datos: GUARDADO });
      await elegirPng();
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));

      await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

      expect(alerta.mock.calls[0][0]).toBe("Tienes cambios sin guardar.");
      const botones = alerta.mock.calls[0][2] as AlertButton[];
      expect(botones.map(({ text }) => text)).toEqual(["Seguir editando", "Descartar"]);
      // Seguir editando solo cierra el aviso: el borrador sigue
      expect(botones[0].onPress).toBeUndefined();
      expect(valorEscala()).toBe("110 %");

      await act(async () => {
        botones[1].onPress?.();
      });

      // Lo guardado: imagen y escala de antes, consultando
      expect(controlesDeEdicion()).toEqual([]);
      expect(uriLogo()).toBe("https://cdn.test/b1/logo-1.png");
      expect(escalaImagen()).toBe(1.7);
      expect(screen.getByText("170 %")).toBeTruthy();
      expect(onVolver).not.toHaveBeenCalled();
      expect(mockGuardar).not.toHaveBeenCalled();
      expect(mockLeerBytes).not.toHaveBeenCalled();
      expect(mockQuitar).not.toHaveBeenCalled();
    });

    test("tras descartar, volver a Editar empieza de lo guardado", async () => {
      jest.spyOn(Alert, "alert").mockImplementation((_titulo, _texto, botones) => {
        botones?.find(({ text }) => text === "Descartar")?.onPress?.();
      });
      await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

      await editar();

      expect(valorEscala()).toBe("170 %");
      expect(guardar().props.accessibilityState.disabled).toBe(true);
    });

    test("descartar retira el error de un intento fallido", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(Alert, "alert").mockImplementation((_titulo, _texto, botones) => {
        botones?.find(({ text }) => text === "Descartar")?.onPress?.();
      });
      mockGuardar.mockRejectedValueOnce(new Error("fallo"));
      await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      await fireEvent.press(guardar());
      await screen.findByText("No se ha podido guardar el logo");

      await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByText("No se ha podido guardar el logo")).toBeNull();
      expect(screen.getByText("170 %")).toBeTruthy();
    });
  });

  describe("Atrás de Android", () => {
    test("consultando: vuelve a Banda", async () => {
      const pulsarAtras = simularAtras();
      const onVolver = await abrir({ datos: GUARDADO });

      expect(await pulsarAtras()).toBe(true);
      expect(onVolver).toHaveBeenCalledTimes(1);
    });

    test("editando sin cambios: vuelve a consultar, no a Banda", async () => {
      const pulsarAtras = simularAtras();
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const onVolver = await abrirEditando({ datos: GUARDADO });

      expect(await pulsarAtras()).toBe(true);

      expect(alerta).not.toHaveBeenCalled();
      expect(onVolver).not.toHaveBeenCalled();
      expect(controlesDeEdicion()).toEqual([]);
      expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();

      // Otro Atrás, ya consultando: a Banda
      expect(await pulsarAtras()).toBe(true);
      expect(onVolver).toHaveBeenCalledTimes(1);
    });

    test("editando con cambios: avisa y no sale perdiendo el borrador", async () => {
      const pulsarAtras = simularAtras();
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const onVolver = await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));

      expect(await pulsarAtras()).toBe(true);

      expect(alerta.mock.calls[0][0]).toBe("Tienes cambios sin guardar.");
      expect(onVolver).not.toHaveBeenCalled();
      expect(valorEscala()).toBe("180 %");
    });

    test("mientras guarda, Atrás no hace nada", async () => {
      mockGuardar.mockReturnValue(new Promise<DatosLogo>(() => {}));
      const pulsarAtras = simularAtras();
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const onVolver = await abrirEditando({ datos: GUARDADO });
      await fireEvent.press(screen.getByRole("button", { name: "Aumentar tamaño" }));
      await fireEvent.press(guardar());

      expect(await pulsarAtras()).toBe(true);

      expect(alerta).not.toHaveBeenCalled();
      expect(onVolver).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Guardando..." })).toBeTruthy();
    });
  });

  test("Volver a Banda (consultando) sale sin preguntar", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onVolver = await abrir({ datos: GUARDADO });

    await fireEvent.press(screen.getByText("Volver a Banda"));

    expect(alerta).not.toHaveBeenCalled();
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  test("quitar el logo (desde consulta) sigue pidiendo confirmación y lo quita", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await abrir({ datos: GUARDADO });

    await fireEvent.press(screen.getByText("Quitar logo"));

    const botones = alerta.mock.calls[0][2] as AlertButton[];
    expect(alerta.mock.calls[0][0]).toBe("¿Quitar el logo?");
    expect(mockQuitar).not.toHaveBeenCalled();

    await act(async () => {
      botones.find(({ text }) => text === "Quitar")?.onPress?.();
    });

    expect(mockQuitar).toHaveBeenCalledWith("b1", "b1/logo-1.png");
    expect(screen.getByText("Sin logo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Añadir logo" })).toBeTruthy();
  });

  test("quien no es admin no lee el archivo ni llega a Storage, aunque se llame a las acciones", async () => {
    simular({ esAdmin: false });
    let contexto: ReturnType<typeof useLogoBandaContext> | null = null;

    function Espia() {
      contexto = useLogoBandaContext();
      return null;
    }

    await render(conProveedor(<Espia />));

    let resultados: boolean[] = [];

    await act(async () => {
      if (contexto === null) {
        throw new Error("Falta el contexto");
      }

      resultados = [
        await contexto.guardarLogo({ imagen: PNG_TRANSPARENTE, escala: 2 }),
        await contexto.guardarLogo({ escala: 2 }),
        await contexto.quitarLogo(),
      ];
    });

    expect(resultados).toEqual([false, false, false]);
    expect(mockLeerBytes).not.toHaveBeenCalled();
    expect(mockGuardar).not.toHaveBeenCalled();
    expect(mockQuitar).not.toHaveBeenCalled();
  });
});

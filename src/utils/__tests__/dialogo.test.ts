import { Alert, type AlertButton } from "react-native";

import * as nativo from "../dialogo";
import * as web from "../dialogo.web";

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

const mockConfirm = jest.fn((_texto?: string) => true);
const confirmOriginal = window.confirm;

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = mockConfirm;
});

afterAll(() => {
  window.confirm = confirmOriginal;
});

function confirmacion(onConfirmar: () => void, extra: Partial<nativo.Confirmacion> = {}) {
  return {
    titulo: "¿Eliminar canción?",
    mensaje: "“Vals” se eliminará del repertorio.",
    textoCancelar: "Cancelar",
    textoConfirmar: "Eliminar",
    destructivo: true,
    onConfirmar,
    ...extra,
  };
}

describe("dialogo nativo (Alert)", () => {
  test("confirmar: Cancelar sin acción y el botón destructivo con la acción", () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const accion = jest.fn();

    nativo.confirmar(confirmacion(accion));

    expect(alerta).toHaveBeenCalledWith("¿Eliminar canción?", "“Vals” se eliminará del repertorio.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: accion },
    ]);
    alerta.mockRestore();
  });

  test("confirmar no destructivo: el botón no lleva estilo", () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const accion = jest.fn();

    nativo.confirmar(
      confirmacion(accion, { textoConfirmar: "Confirmar igualmente", destructivo: false })
    );

    const botones = alerta.mock.calls[0][2] as AlertButton[];

    expect(botones[1]).toEqual({ text: "Confirmar igualmente", onPress: accion });
    expect(botones[1]).not.toHaveProperty("style");
    alerta.mockRestore();
  });

  test("guardar o descartar: Cancelar, Descartar (destructivo) y Guardar, en ese orden", () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onGuardar = jest.fn();
    const onDescartar = jest.fn();

    nativo.preguntarGuardarODescartar({ titulo: "T", mensaje: "M", onGuardar, onDescartar });

    expect(alerta).toHaveBeenCalledWith("T", "M", [
      { text: "Cancelar", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: onDescartar },
      { text: "Guardar", onPress: onGuardar },
    ]);
    alerta.mockRestore();
  });
});

describe("dialogo web (window.confirm)", () => {
  test("Aceptar ejecuta la acción una vez", () => {
    const accion = jest.fn();

    web.confirmar(confirmacion(accion));

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(accion).toHaveBeenCalledTimes(1);
  });

  test("Cancelar no ejecuta la acción", () => {
    mockConfirm.mockReturnValueOnce(false);
    const accion = jest.fn();

    web.confirmar(confirmacion(accion));

    expect(accion).not.toHaveBeenCalled();
  });

  test("el texto lleva título, mensaje y qué hace Aceptar", () => {
    web.confirmar(confirmacion(jest.fn()));

    expect(mockConfirm).toHaveBeenCalledWith(
      "¿Eliminar canción?\n\n“Vals” se eliminará del repertorio.\n\nAceptar: Eliminar."
    );
  });

  test("con un Cancelar propio también lo explica", () => {
    web.confirmar(
      confirmacion(jest.fn(), { textoCancelar: "Seguir editando", textoConfirmar: "Descartar" })
    );

    expect(mockConfirm.mock.calls[0][0]).toContain("Aceptar: Descartar. Cancelar: Seguir editando.");
  });

  test("sin window.confirm (export estático) no hace nada", () => {
    // @ts-expect-error: se simula un entorno sin diálogos del navegador
    window.confirm = undefined;
    const accion = jest.fn();

    web.confirmar(confirmacion(accion));

    expect(accion).not.toHaveBeenCalled();
  });

  describe("guardar o descartar en dos pasos", () => {
    test("Aceptar en el primero: guarda, sin segundo diálogo", () => {
      const onGuardar = jest.fn();
      const onDescartar = jest.fn();

      web.preguntarGuardarODescartar({ titulo: "T", mensaje: "M", onGuardar, onDescartar });

      expect(onGuardar).toHaveBeenCalledTimes(1);
      expect(onDescartar).not.toHaveBeenCalled();
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockConfirm.mock.calls[0][0]).toContain("Aceptar: Guardar.");
    });

    test("Cancelar y luego Aceptar: descarta sin guardar", () => {
      mockConfirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
      const onGuardar = jest.fn();
      const onDescartar = jest.fn();

      web.preguntarGuardarODescartar({ titulo: "T", mensaje: "M", onGuardar, onDescartar });

      expect(onDescartar).toHaveBeenCalledTimes(1);
      expect(onGuardar).not.toHaveBeenCalled();
      expect(mockConfirm.mock.calls[1][0]).toContain("¿Descartar los cambios?");
    });

    test("Cancelar dos veces: no hace nada (se queda donde estaba)", () => {
      mockConfirm.mockReturnValue(false);
      const onGuardar = jest.fn();
      const onDescartar = jest.fn();

      web.preguntarGuardarODescartar({ titulo: "T", mensaje: "M", onGuardar, onDescartar });

      expect(onGuardar).not.toHaveBeenCalled();
      expect(onDescartar).not.toHaveBeenCalled();
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      mockConfirm.mockReturnValue(true);
    });
  });
});

describe("casos migrados", () => {
  const casos: [string, RegExp[]][] = [
    ["src/utils/confirmaciones.ts", [/confirmar\(\{/, /preguntarGuardarODescartar\(\{/]],
    ["src/app/index.tsx", [/textoConfirmar: "Confirmar igualmente"/]],
    ["src/components/PantallaFinanzas.tsx", [/titulo: "¿Eliminar movimiento\?"/]],
    ["src/components/PantallaRepertorio.tsx", [/titulo: "¿Eliminar canción\?"/]],
    ["src/components/PantallaTecnicos.tsx", [/titulo: "Eliminar técnico"/]],
    [
      "src/components/PantallaLogoBanda.tsx",
      [/titulo: "¿Quitar el logo\?"/, /titulo: "Tienes cambios sin guardar\."/],
    ],
  ];

  test.each(casos)("%s usa utils/dialogo y no Alert", (ruta, usos) => {
    const codigo = fs.readFileSync(ruta, "utf8");

    // Ni llamadas ni import (los comentarios pueden nombrarlo)
    expect(codigo).not.toMatch(/Alert\.alert/);
    expect(codigo).not.toMatch(/import \{[^}]*\bAlert\b[^}]*\} from "react-native"/);
    expect(codigo).toMatch(/import \{[^}]*\bconfirmar\b|preguntarGuardarODescartar/);
    usos.forEach((uso) => expect(codigo).toMatch(uso));
  });
});

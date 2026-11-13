// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

import { act, fireEvent, render, screen } from "@testing-library/react-native";

import * as nativo from "../SelectorHora";
import { SelectorHora } from "../SelectorHora.web";
import * as web from "../SelectorHora.web";

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// El <input type="time"> del navegador (en Jest es un elemento sin más)
function campoHora() {
  const [input] = screen.root?.queryAll((elemento) => elemento.type === "input") ?? [];

  if (input === undefined) {
    throw new Error("No hay <input type=\"time\">");
  }

  return input;
}

async function escribir(valor: string) {
  await act(() => {
    fireEvent(campoHora(), "change", { target: { value: valor } });
  });
}

describe("SelectorHora (web)", () => {
  test("pinta un input type=time de minutos con su etiqueta", async () => {
    await render(<SelectorHora hora="" onCambiarHora={jest.fn()} />);

    const input = campoHora();

    expect(screen.getByText("Hora")).toBeTruthy();
    expect(input.props.type).toBe("time");
    expect(input.props.step).toBe(60);
    expect(input.props["aria-label"]).toBe("Hora del evento, sin hora");
  });

  test("sin hora: campo vacío y sin «Quitar hora»", async () => {
    await render(<SelectorHora hora="" onCambiarHora={jest.fn()} />);

    expect(campoHora().props.value).toBe("");
    expect(screen.queryByText("Quitar hora")).toBeNull();
  });

  test("recibe la hora HH:MM tal cual", async () => {
    await render(<SelectorHora hora="20:30" onCambiarHora={jest.fn()} />);

    expect(campoHora().props.value).toBe("20:30");
    expect(campoHora().props["aria-label"]).toBe("Hora del evento");
  });

  test("elegir o cambiar la hora llama al callback con HH:MM", async () => {
    const onCambiarHora = jest.fn();
    await render(<SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />);

    await escribir("09:05");

    expect(onCambiarHora).toHaveBeenCalledWith("09:05");
  });

  test("vaciar el campo (Borrar en iPhone) deja la hora vacía", async () => {
    const onCambiarHora = jest.fn();
    await render(<SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />);

    await escribir("");

    expect(onCambiarHora).toHaveBeenCalledWith("");
  });

  test("Quitar hora deja la hora vacía", async () => {
    const onCambiarHora = jest.fn();
    await render(<SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />);

    await act(() => {
      fireEvent.press(screen.getByText("Quitar hora"));
    });

    expect(onCambiarHora).toHaveBeenCalledWith("");
  });

  test.each(["20:30:15", "24:00", "7:05", "aa:bb"])(
    "un valor que no es HH:MM (%s) no se acepta",
    async (valor) => {
      const onCambiarHora = jest.fn();
      await render(<SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />);

      await escribir(valor);

      expect(onCambiarHora).not.toHaveBeenCalled();
    }
  );

  test("deshabilitado: el input y Quitar hora quedan desactivados", async () => {
    const onCambiarHora = jest.fn();
    await render(<SelectorHora hora="20:30" onCambiarHora={onCambiarHora} disabled />);

    expect(campoHora().props.disabled).toBe(true);

    await act(() => {
      fireEvent.press(screen.getByText("Quitar hora"));
    });

    expect(onCambiarHora).not.toHaveBeenCalled();
  });

  test("el input usa 16px y el tema oscuro del navegador (sin zoom en Safari)", async () => {
    await render(<SelectorHora hora="" onCambiarHora={jest.fn()} />);

    const estilo = campoHora().props.style;

    expect(estilo.fontSize).toBeGreaterThanOrEqual(16);
    expect(estilo.colorScheme).toBe("dark");
    expect(estilo).not.toHaveProperty("outline");
  });
});

describe("misma API en nativo y web", () => {
  test("exportan lo mismo y las conversiones son las mismas funciones", () => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(nativo).sort());
    expect(web.convertirHoraADate).toBe(nativo.convertirHoraADate);
    expect(web.convertirDateAHora).toBe(nativo.convertirDateAHora);
  });

  test("la web no usa el DateTimePicker de @expo/ui y la app sí", () => {
    const codigoWeb = fs.readFileSync("src/components/SelectorHora.web.tsx", "utf8");
    const codigoNativo = fs.readFileSync("src/components/SelectorHora.tsx", "utf8");

    // Solo los imports: el comentario explica por qué no se usa
    expect(codigoWeb).not.toMatch(/from\s+["']@expo\/ui/);
    expect(codigoWeb).not.toMatch(/<DateTimePicker/);
    expect(codigoNativo).toContain('import DateTimePicker from "@expo/ui/community/datetime-picker"');
  });

  test("el formulario importa ./SelectorHora sin ramas de plataforma", () => {
    const formulario = fs.readFileSync("src/components/FormularioEvento.tsx", "utf8");

    expect(formulario).toContain('import { SelectorHora } from "./SelectorHora";');
    expect(formulario).not.toMatch(/SelectorHora\.web|Platform\.OS/);
  });
});

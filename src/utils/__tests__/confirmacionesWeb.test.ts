import { avisarCambiosSinGuardar, confirmarEliminacion } from "../confirmaciones";

// Las confirmaciones del formulario de eventos con los diálogos del navegador,
// como en web / iPhone (Metro resuelve ./dialogo a dialogo.web.ts)
jest.mock("../dialogo", () => jest.requireActual("../dialogo.web"));

const mockConfirm = jest.fn((_texto?: string) => true);
const confirmOriginal = window.confirm;

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirm.mockReturnValue(true);
  window.confirm = mockConfirm;
});

afterAll(() => {
  window.confirm = confirmOriginal;
});

describe("eliminar evento en web", () => {
  test("pregunta con el nombre del evento y Aceptar elimina", () => {
    const onEliminar = jest.fn();

    confirmarEliminacion("Boda Lucena del 15/05/2027", onEliminar);

    expect(mockConfirm.mock.calls[0][0]).toContain("¿Eliminar evento?");
    expect(mockConfirm.mock.calls[0][0]).toContain("«Boda Lucena del 15/05/2027»");
    expect(onEliminar).toHaveBeenCalledTimes(1);
  });

  test("Cancelar no elimina", () => {
    mockConfirm.mockReturnValue(false);
    const onEliminar = jest.fn();

    confirmarEliminacion("Ensayo", onEliminar);

    expect(onEliminar).not.toHaveBeenCalled();
  });
});

describe("cambios sin guardar en web", () => {
  test("Guardar", () => {
    const onGuardar = jest.fn();
    const onDescartar = jest.fn();

    avisarCambiosSinGuardar({ onGuardar, onDescartar });

    expect(mockConfirm.mock.calls[0][0]).toContain("Tienes cambios sin guardar");
    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onDescartar).not.toHaveBeenCalled();
  });

  test("Descartar", () => {
    mockConfirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
    const onGuardar = jest.fn();
    const onDescartar = jest.fn();

    avisarCambiosSinGuardar({ onGuardar, onDescartar });

    expect(onDescartar).toHaveBeenCalledTimes(1);
    expect(onGuardar).not.toHaveBeenCalled();
  });

  test("Cancelar: se queda en el formulario", () => {
    mockConfirm.mockReturnValue(false);
    const onGuardar = jest.fn();
    const onDescartar = jest.fn();

    avisarCambiosSinGuardar({ onGuardar, onDescartar });

    expect(onGuardar).not.toHaveBeenCalled();
    expect(onDescartar).not.toHaveBeenCalled();
  });
});

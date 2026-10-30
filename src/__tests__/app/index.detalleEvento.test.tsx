import { fireEvent, render } from "@testing-library/react-native";
import Index from "../../app/index";
import { useBandaContext } from "../../context/BandaContext";
import { useEventosContext } from "../../context/EventosContext";
import { useMiembrosContext } from "../../context/MiembrosContext";
import { useTecnicosContext } from "../../context/TecnicosContext";
import type { Evento } from "../../types/evento";

// Camino real de la pantalla Calendario: aquí ListaEventos NO se simula,
// para comprobar el detalle tal y como lo ve el usuario.

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Los contextos reales importan el cliente Supabase; aquí nunca se usa
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

jest.mock("../../context/EventosContext", () => ({
  ...jest.requireActual("../../context/EventosContext"),
  useEventosContext: jest.fn(),
}));

jest.mock("../../context/MiembrosContext", () => ({
  ...jest.requireActual("../../context/MiembrosContext"),
  useMiembrosContext: jest.fn(),
}));

jest.mock("../../context/TecnicosContext", () => ({
  ...jest.requireActual("../../context/TecnicosContext"),
  useTecnicosContext: jest.fn(),
}));

jest.mock("../../context/BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

// Formulario, calendario y cierre de sesión tienen sus propios tests
jest.mock("../../components/FormularioEvento", () => {
  const { Text } = require("react-native");

  return {
    FormularioEvento: () => <Text>Formulario simulado</Text>,
  };
});

jest.mock("../../components/CalendarioEventos", () => {
  const { Text } = require("react-native");

  return {
    CalendarioEventos: () => <Text>Calendario simulado</Text>,
  };
});

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = require("react-native");

  return {
    BotonCerrarSesion: () => <Text>Cerrar sesión</Text>,
  };
});

const mockUseEventosContext = jest.mocked(useEventosContext);
const mockUseTecnicosContext = jest.mocked(useTecnicosContext);
const mockUseMiembrosContext = jest.mocked(useMiembrosContext);
const mockUseBandaContext = jest.mocked(useBandaContext);

// Tal y como llega desde Supabase: fecha interna YYYY-MM-DD
const concierto: Evento = {
  id: "e1",
  titulo: "Concierto abierto Montilla 29/10/2026",
  tipo: "concierto_abierto",
  fecha: "2026-10-29",
  hora: "21:00",
  lugar: "Montilla",
  notas: "Llevar atriles",
  estado: "confirmado",
  tecnicoIds: ["t1"],
  miembroIds: ["m1"],
};

function simularPantalla(esAdmin: boolean) {
  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual: { id: "b1", nombre: "Cathaline", creadaPor: "u1", creadaEn: "2026-01-01" },
    pertenenciaActual: null,
    cargando: false,
    errorCarga: "",
    error: "",
    esAdmin,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas: jest.fn(),
  });

  mockUseEventosContext.mockReturnValue({
    eventos: [concierto],
    titulo: "",
    tipo: "concierto_abierto",
    estado: "pendiente",
    fecha: "",
    hora: "",
    lugar: "",
    notas: "",
    tecnicoIds: [],
    miembroIds: [],
    error: "",
    eventoEditandoId: null,
    setTipo: jest.fn(),
    setEstado: jest.fn(),
    setFecha: jest.fn(),
    setHora: jest.fn(),
    setLugar: jest.fn(),
    setNotas: jest.fn(),
    alternarTecnico: jest.fn(),
    alternarMiembro: jest.fn(),
    reemplazarEventos: jest.fn(),
    guardarEvento: jest.fn(),
    eliminarEvento: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    procesando: false,
    cargando: false,
    errorPersistencia: "",
  });

  mockUseTecnicosContext.mockReturnValue({
    tecnicos: [{ id: "t1", nombre: "Carlos" }],
    nombre: "",
    error: "",
    tecnicoEditandoId: null,
    setNombre: jest.fn(),
    reemplazarTecnicos: jest.fn(),
    guardarTecnico: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    eliminarTecnico: jest.fn(),
    errorEliminacion: "",
    procesando: false,
    cargando: false,
    errorPersistencia: "",
  });

  mockUseMiembrosContext.mockReturnValue({
    miembros: [{ id: "m1", nombre: "Paco" }],
    nombre: "",
    error: "",
    miembroEditandoId: null,
    procesando: false,
    setNombre: jest.fn(),
    reemplazarMiembros: jest.fn(),
    guardarMiembro: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    eliminarMiembro: jest.fn(),
    errorEliminacion: "",
    cargando: false,
    errorPersistencia: "",
  });
}

describe("Calendario → detalle del evento", () => {
  test.each([
    ["admin", true],
    ["sin ser admin", false],
  ])("%s: la tarjeta cerrada muestra tipo, lugar, fecha y estado sin hora; al abrirla, el detalle", async (_, esAdmin) => {
    simularPantalla(esAdmin);

    const { getByText, queryByText, toJSON } = await render(<Index />);

    // Cerrada: tipo + lugar, fecha DD/MM/YYYY y estado; nunca la hora
    expect(getByText("Concierto abierto Montilla")).toBeTruthy();
    expect(getByText("29/10/2026")).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    expect(queryByText(/^Fecha:/)).toBeNull();
    expect(JSON.stringify(toJSON())).not.toMatch(/29-10-2026|2026-10-29|21:00/);

    await fireEvent.press(getByText("Concierto abierto Montilla"));

    expect(getByText("Fecha: 29/10/2026")).toBeTruthy();
    expect(getByText("Hora: 21:00")).toBeTruthy();
    expect(queryByText("Fecha: 29-10-2026")).toBeNull();
    // Editar y Eliminar solo para el admin
    expect(queryByText("Editar") !== null).toBe(esAdmin);
    expect(queryByText("Eliminar") !== null).toBe(esAdmin);
  });

  test("el detalle abierto sigue el orden Tipo, Fecha, Hora, Lugar, Estado, Técnico, Músicos, Nota y no muestra Título", async () => {
    simularPantalla(true);

    const { getByText, toJSON } = await render(<Index />);

    await fireEvent.press(getByText("Concierto abierto Montilla"));

    const renderizado = JSON.stringify(toJSON());
    expect(renderizado).not.toContain("Título");
    expect(renderizado).not.toContain("Concierto abierto Montilla 29/10/2026");

    const posiciones = [
      "Tipo de evento: ",
      "Fecha: ",
      "Hora: ",
      "Lugar: ",
      "Estado: ",
      "Técnico: ",
      "Músicos: ",
      "Nota: ",
    ].map((marcador) => renderizado.indexOf(marcador));

    expect(posiciones.every((posicion) => posicion >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });
});

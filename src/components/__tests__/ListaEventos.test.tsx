import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking, StyleSheet } from "react-native";
import type { Evento } from "../../types/evento";
import type { Tecnico } from "../../types/tecnico";
import { Colors } from "../../constants/theme";
import { ListaEventos } from "../ListaEventos";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

const tecnicos: Tecnico[] = [
  {
    id: "1",
    nombre: "Carlos",
  },
  {
    id: "2",
    nombre: "Miguel",
  },
];

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Sevilla",
    tipo: "concierto_abierto",
    fecha: "2026-11-15",
    hora: "",
    lugar: "",
    notas: "",
    estado: "confirmado",
    tecnicoIds: ["1", "2"],
    googleMapsUrl: null,
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-11-20",
    hora: "",
    lugar: "",
    notas: "",
    estado: "pendiente",
    tecnicoIds: [],
    googleMapsUrl: null,
  },
];

const boda: Evento = {
  id: "30",
  titulo: "Boda de María y Juan",
  tipo: "boda",
  fecha: "2027-05-15",
  hora: "20:30",
  lugar: "Lucena",
  notas: "Prueba de sonido a las 18:00",
  estado: "confirmado",
  tecnicoIds: ["1"],
  googleMapsUrl: null,
};

const fiesta: Evento = {
  id: "31",
  titulo: "Cumpleaños de Laura",
  tipo: "fiesta_privada",
  fecha: "2027-06-01",
  hora: "",
  lugar: "Córdoba",
  notas: "",
  estado: "pendiente",
  tecnicoIds: [],
  googleMapsUrl: null,
};

async function renderizar(lista: Evento[], procesando = false, puedeEditar = true) {
  const onEliminar = jest.fn();
  const onEditar = jest.fn();

  const resultado = await render(
    <ListaEventos
      eventos={lista}
      tecnicos={tecnicos}
      procesando={procesando}
      puedeEditar={puedeEditar}
      onEliminar={onEliminar}
      onEditar={onEditar}
    />
  );

  return { ...resultado, onEliminar, onEditar };
}

// La tarjeta se busca por su etiqueta accesible: "Ver detalles de Tipo Lugar, fecha. Estado X"
async function abrir(vistaPrevia: string) {
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(`^Ver detalles de ${vistaPrevia},`) }));
}

describe("ListaEventos", () => {
  test("tarjeta: tipo y estado arriba, debajo el lugar y luego la fecha, sin etiquetas", async () => {
    const { getByText, queryByText, toJSON } = await renderizar([boda]);

    const tipo = getByText("Boda");
    const badge = getByText("Confirmado");

    // Tipo y badge en la misma fila (el badge dentro de su fondo de color)
    expect(badge.parent?.parent).toBe(tipo.parent);
    // El lugar va solo, separado del tipo
    expect(getByText("Lucena")).toBeTruthy();
    expect(queryByText("Boda Lucena")).toBeNull();
    expect(queryByText("Lugar")).toBeNull();
    expect(queryByText("Fecha")).toBeNull();

    const renderizado = JSON.stringify(toJSON());
    const orden = ['"Boda"', '"Confirmado"', '"Lucena"', '"15/05/2027"'].map((texto) =>
      renderizado.indexOf(texto)
    );

    expect(orden.every((posicion) => posicion >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  test("el lugar va en segundo plano y la fecha sigue con su estilo", async () => {
    const { getByText } = await renderizar([boda]);

    const tipo = StyleSheet.flatten(getByText("Boda").props.style);
    const lugar = StyleSheet.flatten(getByText("Lucena").props.style);

    expect(lugar.color).not.toBe(tipo.color);
    expect(lugar.fontWeight).not.toBe(tipo.fontWeight);
  });

  test("con un tipo largo el badge conserva su sitio a la derecha", async () => {
    const { getByText } = await renderizar([boda]);

    const tipo = getByText("Boda");
    const fila = StyleSheet.flatten(tipo.parent?.props.style);
    const fondoBadge = StyleSheet.flatten(getByText("Confirmado").parent?.props.style);

    // Sin saltar de fila: el tipo ocupa lo que queda y baja de línea si no cabe
    expect(fila.flexDirection).toBe("row");
    expect(fila.flexWrap).toBeUndefined();
    expect(StyleSheet.flatten(tipo.props.style).flex).toBe(1);
    expect(fondoBadge.flexShrink).toBe(0);
  });

  test("la etiqueta accesible sigue diciendo el estado aunque el detalle no lo repita", async () => {
    await renderizar([boda]);

    const tarjeta = screen.getByRole("button", { name: /^Ver detalles de/ });

    expect(tarjeta.props.accessibilityLabel).toBe(
      "Ver detalles de Boda Lucena, 15/05/2027. Estado Confirmado"
    );

    await fireEvent.press(tarjeta);

    expect(screen.queryByText("Estado")).toBeNull();
    expect(tarjeta.props.accessibilityLabel).toMatch(/Estado Confirmado$/);
  });

  test("muestra una vista previa cerrada con tipo y lugar", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    expect(getByText("Boda")).toBeTruthy();
    expect(getByText("Lucena")).toBeTruthy();
    expect(queryByText(/^Título:/)).toBeNull();
    expect(queryByText("Técnico")).toBeNull();
    expect(queryByText(/^Nota:/)).toBeNull();
    expect(queryByText("Editar evento")).toBeNull();
    expect(queryByText("Eliminar evento")).toBeNull();
  });

  test("la vista previa cerrada muestra tipo + lugar + fecha DD/MM/YYYY + estado, sin hora", async () => {
    const { getByText, queryByText, toJSON } = await renderizar([boda]);

    expect(screen.getByRole("button", { name: /^Ver detalles de Boda Lucena,/ })).toBeTruthy();
    expect(getByText("15/05/2027")).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    // La fecha va sola, sin etiqueta: el detalle sigue cerrado
    expect(queryByText(/^Fecha:/)).toBeNull();
    expect(queryByText(/^Hora:/)).toBeNull();

    const renderizado = JSON.stringify(toJSON());
    expect(renderizado).not.toMatch(/15-05-2027|2027-05-15|20:30/);
  });

  test("sin lugar la vista previa cerrada muestra tipo + fecha + estado, sin hueco", async () => {
    const { getByText, queryByText } = await renderizar([
      { ...boda, tipo: "ensayo", lugar: "", estado: "pendiente" },
    ]);

    expect(getByText("Ensayo")).toBeTruthy();
    expect(getByText("15/05/2027")).toBeTruthy();
    expect(getByText("Pendiente")).toBeTruthy();
    expect(queryByText(/^Ensayo\s/)).toBeNull();
    expect(queryByText(/20:30/)).toBeNull();
  });

  test("al abrir el evento la fecha sigue solo en la tarjeta, en formato DD/MM/YYYY", async () => {
    await renderizar([fiesta]);

    await abrir("Fiesta privada Córdoba");

    // Solo en la tarjeta: el detalle no la repite, ni en otro formato
    expect(screen.getAllByText("01/06/2027")).toHaveLength(1);
    expect(screen.queryByText("Fecha")).toBeNull();
    expect(screen.queryByText(/01-06-2027/)).toBeNull();
  });

  test("muestra el badge Confirmado en la vista previa sin abrir el evento", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    expect(screen.getByRole("button", { name: /^Ver detalles de Boda Lucena,/ })).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    // El detalle sigue cerrado
    expect(queryByText(/^Estado:/)).toBeNull();
    expect(queryByText(/^Título:/)).toBeNull();
  });

  test("muestra el badge Pendiente en la vista previa sin abrir el evento", async () => {
    const { getByText, queryByText } = await renderizar([fiesta]);

    expect(screen.getByRole("button", { name: /^Ver detalles de Fiesta privada Córdoba,/ })).toBeTruthy();
    expect(getByText("Pendiente")).toBeTruthy();
    expect(queryByText(/^Título:/)).toBeNull();
  });

  test("Pendiente y Confirmado usan colores distintos y siempre muestran texto", async () => {
    const { getByText } = await renderizar([boda, fiesta]);

    const colorConfirmado = StyleSheet.flatten(getByText("Confirmado").props.style);
    const colorPendiente = StyleSheet.flatten(getByText("Pendiente").props.style);

    expect(colorConfirmado.color).toBeDefined();
    expect(colorPendiente.color).toBeDefined();
    expect(colorConfirmado.color).not.toBe(colorPendiente.color);
  });

  test("al pulsar la vista previa muestra el detalle completo, sin Título", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");

    // El título se guarda internamente, pero ya no se muestra
    expect(queryByText(/^Título:/)).toBeNull();
    expect(queryByText("Boda de María y Juan")).toBeNull();
    // Solo la hora: la fecha ya está en la tarjeta y no se repite en el detalle
    expect(getByText("Hora")).toBeTruthy();
    expect(getByText("20:30")).toBeTruthy();
    expect(queryByText("Fecha")).toBeNull();
    expect(queryByText(/·/)).toBeNull();
    expect(screen.getAllByText("15/05/2027")).toHaveLength(1);
    expect(screen.queryByText(/15-05-2027/)).toBeNull();
    // El lugar solo en la tarjeta: el detalle no lo repite
    expect(screen.getAllByText("Lucena")).toHaveLength(1);
    expect(queryByText("Lugar")).toBeNull();
    // El estado solo está en el badge de la tarjeta: el detalle no lo repite
    expect(queryByText("Estado")).toBeNull();
    expect(screen.getAllByText("Confirmado")).toHaveLength(1);
    expect(screen.queryByText("confirmado")).toBeNull();
    expect(getByText("Técnico")).toBeTruthy();
    expect(getByText("Carlos")).toBeTruthy();
    // Los músicos ya no existen en la app
    expect(queryByText(/Músicos|Miembros/)).toBeNull();
    expect(getByText("Editar evento")).toBeTruthy();
    expect(getByText("Eliminar evento")).toBeTruthy();
  });

  test("muestra la nota completa y no el antiguo aviso", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");

    expect(getByText("Notas")).toBeTruthy();
    expect(getByText("Prueba de sonido a las 18:00")).toBeTruthy();
    expect(queryByText("Tiene notas")).toBeNull();
  });

  test("enseña el técnico bajo Personal", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");

    expect(getByText("Carlos")).toBeTruthy();
    expect(queryByText(/Técnicos:/)).toBeNull();
  });

  test("enseña varios técnicos en una línea", async () => {
    const { getByText, queryByText } = await renderizar(eventos);

    await abrir("Concierto abierto");

    expect(getByText("Carlos, Miguel")).toBeTruthy();
    expect(queryByText(/Técnicos:/)).toBeNull();
  });

  test("muestra Sin asignar si no hay técnicos", async () => {
    const { getByText } = await renderizar(eventos);

    await abrir("Ensayo");

    expect(getByText("Sin asignar")).toBeTruthy();
  });

  test("ignora los ids que no corresponden a ningún técnico", async () => {
    const { getByText } = await renderizar([
      { ...eventos[0], tecnicoIds: ["1", "99"] },
    ]);

    await abrir("Concierto abierto");

    expect(getByText("Carlos")).toBeTruthy();
  });

  test("el detalle no tiene ninguna línea de músicos", async () => {
    const { getByText, queryByText } = await renderizar(eventos);

    await abrir("Concierto abierto");

    expect(getByText("Técnico")).toBeTruthy();
    expect(queryByText(/^Músicos:/)).toBeNull();
    expect(queryByText(/Músicos|Miembros/)).toBeNull();
  });

  test("sin lugar la vista previa es solo el tipo y no hay líneas vacías", async () => {
    const bodaSinDetalles: Evento = {
      ...boda,
      hora: "",
      lugar: "",
      notas: "",
    };

    const { getByText, queryByText } = await renderizar([bodaSinDetalles]);

    expect(getByText("Boda")).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    // No se usa el título del evento como relleno de la vista previa
    expect(queryByText("Boda de María y Juan")).toBeNull();

    await abrir("Boda");

    // Sin hora no hay bloque Hora ni ninguna hora inventada; la fecha solo en la tarjeta
    expect(queryByText("Hora")).toBeNull();
    expect(queryByText("Fecha")).toBeNull();
    expect(queryByText(/\d{1,2}:\d{2}/)).toBeNull();
    expect(screen.getAllByText("15/05/2027")).toHaveLength(1);
    expect(queryByText(/·/)).toBeNull();
    expect(queryByText("Notas")).toBeNull();
    // El estado sigue en el badge y no se repite en el detalle
    expect(screen.getAllByText("Confirmado")).toHaveLength(1);
    expect(queryByText("Estado")).toBeNull();
  });

  test("muestra el tipo con su etiqueta y no con el valor interno", async () => {
    const { getByText, queryByText } = await renderizar([
      { ...eventos[0], id: "10", tipo: "fiesta_privada" },
      { ...eventos[1], id: "11", tipo: "concierto_abierto" },
    ]);

    expect(getByText("Fiesta privada")).toBeTruthy();
    expect(getByText("Concierto abierto")).toBeTruthy();

    await abrir("Fiesta privada");

    expect(getByText(/^Fiesta privada/)).toBeTruthy();
    expect(queryByText(/fiesta_privada/)).toBeNull();
    expect(queryByText(/_/)).toBeNull();
  });

  test("pulsar de nuevo cierra el detalle", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");
    expect(getByText("Técnico")).toBeTruthy();

    await abrir("Boda Lucena");

    expect(queryByText("Técnico")).toBeNull();
    expect(queryByText("Editar evento")).toBeNull();
    expect(screen.getByRole("button", { name: /^Ver detalles de Boda Lucena,/ })).toBeTruthy();
  });

  test("solo hay un evento abierto a la vez", async () => {
    const { getAllByText, getByText, queryByText } = await renderizar([
      boda,
      fiesta,
    ]);

    await abrir("Boda Lucena");
    expect(getByText("Técnico")).toBeTruthy();

    await abrir("Fiesta privada Córdoba");

    // getAllByText: exactamente un detalle abierto
    expect(getAllByText("Técnico")).toHaveLength(1);
    expect(queryByText("20:30")).toBeNull();
    expect(getAllByText("Editar evento")).toHaveLength(1);
  });

  test("la vista previa es un botón accesible que indica si está desplegado", async () => {
    const { getByRole } = await renderizar([boda]);

    expect(
      getByRole("button", {
        name: "Ver detalles de Boda Lucena, 15/05/2027. Estado Confirmado",
        expanded: false,
      })
    ).toBeTruthy();

    await abrir("Boda Lucena");

    expect(
      getByRole("button", {
        name: "Ver detalles de Boda Lucena, 15/05/2027. Estado Confirmado",
        expanded: true,
      })
    ).toBeTruthy();
  });

  test("llama a onEliminar con el id correcto", async () => {
    const { getByText, onEliminar } = await renderizar(eventos);

    await abrir("Concierto abierto");
    await fireEvent.press(getByText("Eliminar evento"));

    expect(onEliminar).toHaveBeenCalledTimes(1);
    expect(onEliminar).toHaveBeenCalledWith("1");
  });

  test("llama a onEditar con el evento correcto", async () => {
    const { getByText, onEditar } = await renderizar(eventos);

    await abrir("Ensayo");
    await fireEvent.press(getByText("Editar evento"));

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(eventos[1]);
  });

  test("deshabilita Editar y Eliminar mientras procesa", async () => {
    const { getByRole, getByText, onEditar, onEliminar } = await renderizar(
      eventos,
      true
    );

    await abrir("Concierto abierto");

    expect(getByRole("button", { name: "Editar evento", disabled: true })).toBeTruthy();
    expect(getByRole("button", { name: "Eliminar evento", disabled: true })).toBeTruthy();

    await fireEvent.press(getByText("Editar evento"));
    await fireEvent.press(getByText("Eliminar evento"));

    expect(onEditar).not.toHaveBeenCalled();
    expect(onEliminar).not.toHaveBeenCalled();
  });

  test("sin permiso de edición abre el detalle completo pero sin Editar ni Eliminar", async () => {
    const { getByText, queryByText } = await renderizar(eventos, false, false);

    await abrir("Concierto abierto");

    expect(getByText("Técnico")).toBeTruthy();
    expect(getByText("Carlos, Miguel")).toBeTruthy();
    expect(queryByText(/^Músicos:/)).toBeNull();
    expect(queryByText("Editar evento")).toBeNull();
    expect(queryByText("Eliminar evento")).toBeNull();
    // No se enseña el rol
    expect(queryByText(/admin|usuario|solo lectura/i)).toBeNull();
  });
});

describe("ListaEventos: evento que no se puede eliminar", () => {
  const AVISO = {
    eventoId: "1",
    mensaje: "No se puede eliminar este evento porque tiene movimientos financieros asociados.",
  };

  async function abrir(nombre: RegExp) {
    await fireEvent.press(screen.getByRole("button", { name: nombre }));
  }

  test("el motivo sale junto a los botones de ese evento", async () => {
    await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={false}
        puedeEditar
        errorEliminacion={AVISO}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    await abrir(/^Ver detalles de Concierto abierto/);

    expect(screen.getByText(AVISO.mensaje)).toBeTruthy();
  });

  test("no sale en otro evento", async () => {
    await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={false}
        puedeEditar
        errorEliminacion={AVISO}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    await abrir(/^Ver detalles de Ensayo/);

    expect(screen.queryByText(AVISO.mensaje)).toBeNull();
  });

  test("sin error la tarjeta sigue igual", async () => {
    await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={false}
        puedeEditar
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    await abrir(/^Ver detalles de Concierto abierto/);

    expect(screen.queryByText(/movimientos financieros/)).toBeNull();
  });
});

describe("ListaEventos: datos económicos", () => {
  const DATOS = { caches: { "1": 160000, "2": 0 }, cargando: false, error: "" };

  async function pintar(datosEconomicos?: {
    caches: Record<string, number>;
    cargando: boolean;
    error: string;
  } | null) {
    await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={false}
        puedeEditar={datosEconomicos !== undefined && datosEconomicos !== null}
        datosEconomicos={datosEconomicos}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );
  }

  const abrirConcierto = () =>
    fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Concierto abierto/ }));
  const abrirEnsayo = () =>
    fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo/ }));

  test("el admin ve el bloque con el importe en formato español", async () => {
    await pintar(DATOS);
    await abrirConcierto();

    expect(screen.getByText("Caché")).toBeTruthy();
    expect(screen.getByText("1.600 €")).toBeTruthy();
    expect(screen.queryByText("Datos económicos")).toBeNull();
    expect(screen.queryByText("Personal")).toBeNull();
  });

  test("un caché con céntimos los enseña: nunca muestra un importe falso", async () => {
    await pintar({ ...DATOS, caches: { "1": 120050 } });
    await abrirConcierto();

    expect(screen.getByText("1.200,50 €")).toBeTruthy();
  });

  test("un caché de 0 se ve como 0 €, no como que falta", async () => {
    await pintar(DATOS);
    await abrirEnsayo();

    expect(screen.getByText("0 €")).toBeTruthy();
    expect(screen.queryByText("Sin caché registrado")).toBeNull();
  });

  test("sin caché lo dice claramente", async () => {
    await pintar({ ...DATOS, caches: {} });
    await abrirConcierto();

    expect(screen.getByText("Sin caché registrado")).toBeTruthy();
  });

  test("si no se pudo cargar no afirma que no haya caché", async () => {
    await pintar({ ...DATOS, caches: {}, error: "No se ha podido cargar el caché" });
    await abrirConcierto();

    expect(screen.getByText("No disponible")).toBeTruthy();
    expect(screen.queryByText("Sin caché registrado")).toBeNull();
  });

  test("mientras carga tampoco", async () => {
    await pintar({ ...DATOS, caches: {}, cargando: true });
    await abrirConcierto();

    expect(screen.getByText("Cargando...")).toBeTruthy();
    expect(screen.queryByText("Sin caché registrado")).toBeNull();
  });

  test.each([[undefined], [null]])("un usuario normal no tiene el bloque (%s)", async (datos) => {
    await pintar(datos);
    await abrirConcierto();

    expect(screen.queryByText("Caché")).toBeNull();
    expect(screen.queryByText(/€/)).toBeNull();
    // Sus datos públicos siguen ahí
    expect(screen.getByText("Técnico")).toBeTruthy();
    expect(screen.getByText("Carlos, Miguel")).toBeTruthy();
  });

  test("todas las etiquetas del detalle usan el mismo estilo, más discreto que su valor", async () => {
    await render(
      <ListaEventos
        eventos={[{ ...eventos[0], hora: "20:30", lugar: "Lucena", notas: "Con prueba" }]}
        tecnicos={tecnicos}
        procesando={false}
        puedeEditar
        datosEconomicos={DATOS}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );
    await abrirConcierto();

    const estilos = ["Hora", "Técnico", "Caché", "Notas"].map((etiqueta) =>
      StyleSheet.flatten(screen.getByText(etiqueta).props.style)
    );
    const valor = StyleSheet.flatten(screen.getByText("Con prueba").props.style);

    for (const estilo of estilos) {
      expect(estilo).toEqual(estilos[0]);
      expect(estilo.textTransform).toBeUndefined();
    }

    expect(estilos[0].fontSize).toBeLessThan(valor.fontSize ?? 0);
    expect(estilos[0].color).not.toBe(valor.color);
  });

  test("con varios técnicos la etiqueta sigue en singular y salen todos", async () => {
    await pintar(DATOS);
    await abrirConcierto();

    expect(screen.getByText("Técnico")).toBeTruthy();
    expect(screen.getByText("Carlos, Miguel")).toBeTruthy();
  });

  test("Editar es secundario y Eliminar queda como destructivo, sin relleno", async () => {
    await pintar(DATOS);
    await abrirConcierto();

    const editar = StyleSheet.flatten(screen.getByRole("button", { name: "Editar evento" }).props.style);
    const eliminar = StyleSheet.flatten(screen.getByRole("button", { name: "Eliminar evento" }).props.style);

    expect(editar.borderRadius).toBe(999);
    expect(eliminar.backgroundColor).toBeUndefined();
  });
});

describe("ListaEventos: enlace de Google Maps", () => {
  const ENLACE = "https://maps.app.goo.gl/AbCdEf123?g_st=iw";
  const conEnlace: Evento = { ...eventos[0], lugar: "Caseta Municipal", googleMapsUrl: ENLACE };

  // jest-expo ya trae Linking simulado: cada prueba empieza sin llamadas anteriores
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function pintar(evento: Evento, puedeEditar = true) {
    await render(
      <ListaEventos
        eventos={[evento]}
        tecnicos={tecnicos}
        procesando={false}
        puedeEditar={puedeEditar}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de/ }));
  }

  const boton = () =>
    screen.getByRole("link", { name: "Abrir ubicación del evento en Google Maps" });

  test("con enlace muestra el botón, sin enseñar la URL", async () => {
    await pintar(conEnlace);

    expect(boton()).toBeTruthy();
    expect(screen.getByText("Abrir en Google Maps")).toBeTruthy();
    expect(screen.queryByText(new RegExp("maps\\.app\\.goo\\.gl"))).toBeNull();
    // Después del técnico, como información adicional del detalle
    const renderizado = JSON.stringify(screen.toJSON());
    expect(renderizado.indexOf('"Técnico"')).toBeLessThan(renderizado.indexOf('"Abrir en Google Maps"'));
    // El lugar sigue a la vista en la tarjeta, aparte y sin repetirse
    expect(screen.getAllByText("Caseta Municipal")).toHaveLength(1);
    expect(screen.queryByText("Lugar")).toBeNull();
  });

  test("sin enlace no hay botón", async () => {
    await pintar(eventos[0]);

    expect(screen.queryByText("Abrir en Google Maps")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  test("un usuario normal también lo ve, y sigue sin poder editar", async () => {
    await pintar(conEnlace, false);

    expect(boton()).toBeTruthy();
    expect(screen.queryByText("Editar evento")).toBeNull();
    expect(screen.queryByText("Eliminar evento")).toBeNull();
  });

  test("pulsarlo abre exactamente el enlace guardado", async () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    await pintar(conEnlace);
    await fireEvent.press(boton());

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith(ENLACE);
    expect(screen.queryByText("No se ha podido abrir Google Maps.")).toBeNull();
  });

  test("si no se puede abrir, lo explica sin romper", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("Sin aplicación"));

    await pintar(conEnlace);
    await fireEvent.press(boton());

    expect(await screen.findByText("No se ha podido abrir Google Maps.")).toBeTruthy();
    expect(boton()).toBeTruthy();
  });

  test("es una acción secundaria con zona táctil cómoda, no un botón principal", async () => {
    await pintar(conEnlace);

    const estilo = StyleSheet.flatten(boton().props.style);

    expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
    expect(estilo.backgroundColor).not.toBe(Colors.light.primary);
  });
});

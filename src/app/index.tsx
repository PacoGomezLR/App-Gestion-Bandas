import {
  Button,
  ScrollView,
  Text,
} from "react-native";
import { FormularioEvento } from "../components/FormularioEvento";
import { ListaEventos } from "../components/ListaEventos";
import { useEventos } from "../hooks/useEventos";

export default function Index() {
  const {
    eventos,
    titulo,
    tipo,
    estado,
    fecha,
    error,
    eventoEditandoId,
    setTitulo,
    setTipo,
    setEstado,
    setFecha,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
  } = useEventos();

  const eventosVisibles =
    fecha === ""
      ? eventos
      : eventos.filter((evento) => evento.fecha === fecha);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
      }}
    >
      <Text>Calendario</Text>

      <FormularioEvento
        titulo={titulo}
        tipo={tipo}
        estado={estado}
        fecha={fecha}
        fechasConEventos={eventos.map((evento) => evento.fecha)}
        error={error}
        editando={eventoEditandoId !== null}
        onCambiarTitulo={setTitulo}
        onCambiarTipo={setTipo}
        onCambiarEstado={setEstado}
        onSeleccionarFecha={setFecha}
        onGuardar={guardarEvento}
        onCancelar={cancelarEdicion}
      />

      {fecha !== "" && (
        <Button
          title="Ver todos"
          onPress={() => setFecha("")}
        />
      )}

      <ListaEventos
        eventos={eventosVisibles}
        onEliminar={eliminarEvento}
        onEditar={prepararEdicion}
      />
    </ScrollView>
  );
}

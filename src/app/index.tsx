import { Text, View } from "react-native";
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
  } = useEventos();

  return (
    <View>
      <Text>Calendario</Text>

      <FormularioEvento
        titulo={titulo}
        tipo={tipo}
        estado={estado}
        fecha={fecha}
        error={error}
        editando={eventoEditandoId !== null}
        onCambiarTitulo={setTitulo}
        onCambiarTipo={setTipo}
        onCambiarEstado={setEstado}
        onSeleccionarFecha={setFecha}
        onGuardar={guardarEvento}
      />

      <ListaEventos
        eventos={eventos}
        onEliminar={eliminarEvento}
        onEditar={prepararEdicion}
      />
    </View>
  );
}

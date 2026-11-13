import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useLogoBandaContext } from "../context/LogoBandaContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";
import {
  aumentarEscalaLogo,
  ESCALA_LOGO,
  porcentajeEscalaLogo,
  reducirEscalaLogo,
} from "../utils/escalaLogo";
import { confirmar } from "../utils/dialogo";
import type { ImagenElegida } from "../utils/formatoLogo";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { LogoBanda } from "./LogoBanda";
import { BotonPrincipal, Mensaje } from "./PantallaBase";
import { crearEstilosPantallaLogoBanda } from "./PantallaLogoBanda.styles";
import { BotonDestructivo, BotonSecundario, CabeceraPantalla, PantallaInterior } from "./PantallaInterior";

// Lo que se ve la confirmación de guardado. Solo es un aviso visual: nada depende de ello
export const DURACION_CONFIRMACION_LOGO = 4000;

interface PantallaLogoBandaProps {
  nombreBanda: string;
  // Las pestañas siguen montadas: Atrás solo se intercepta en la que se ve
  enFoco: boolean;
  onVolver: () => void;
}

// Solo para el admin (la monta Banda). Se entra consultando el logo; los
// controles solo aparecen al pulsar Editar (o Añadir logo si aún no hay).
// Elegir una imagen o cambiar el tamaño es un borrador: la banda no cambia hasta Guardar
export function PantallaLogoBanda({ nombreBanda, enFoco, onVolver }: PantallaLogoBandaProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPantallaLogoBanda(tema), [tema]);
  const { url, escala, procesando, errorOperacion, guardarLogo, quitarLogo, limpiarErrorOperacion } =
    useLogoBandaContext();

  const [editando, setEditando] = useState(false);
  const [guardadoConfirmado, setGuardadoConfirmado] = useState(false);

  // Borrador: null = sin tocar (se ve lo guardado)
  const [imagenNueva, setImagenNueva] = useState<ImagenElegida | null>(null);
  const [escalaBorrador, setEscalaBorrador] = useState<number | null>(null);

  const escalaVisible = escalaBorrador ?? escala;
  const uriVisible = imagenNueva?.uri ?? url;
  const hayCambios = imagenNueva !== null || (escalaBorrador !== null && escalaBorrador !== escala);

  // La confirmación se retira sola; si se sale antes, no queda ningún temporizador
  useEffect(() => {
    if (!guardadoConfirmado) {
      return;
    }

    const temporizador = setTimeout(() => setGuardadoConfirmado(false), DURACION_CONFIRMACION_LOGO);

    return () => clearTimeout(temporizador);
  }, [guardadoConfirmado]);

  function limpiarBorrador() {
    setImagenNueva(null);
    setEscalaBorrador(null);
  }

  function entrarEnEdicion() {
    setGuardadoConfirmado(false);
    limpiarErrorOperacion();
    setEditando(true);
  }

  // Vuelve a lo guardado: no toca Supabase
  function salirDeEdicion() {
    limpiarBorrador();
    limpiarErrorOperacion();
    setEditando(false);
  }

  async function elegirImagen() {
    // El archivo original, tal cual: un logo no se recorta ni se recomprime.
    // - Sin editor: el recorte obligaba a un cuadrado y re-codificaba la imagen.
    // - quality 1: sin recompresión (en Android, copia exacta del archivo).
    // - Sin base64: en iOS siempre es JPEG y en Android, con compresión, también:
    //   perdía la transparencia. Se leen los bytes del archivo al guardar.
    // - iOS: una foto HEIC llega como JPEG; un PNG sigue siendo PNG
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      base64: false,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    const imagen = resultado.canceled ? null : resultado.assets[0];

    // Solo vista previa: no se sube nada hasta Guardar. Otra imagen empieza a tamaño normal
    if (imagen) {
      setImagenNueva({ uri: imagen.uri, mimeType: imagen.mimeType, fileName: imagen.fileName });
      setEscalaBorrador(ESCALA_LOGO.defecto);
    }
  }

  async function guardar() {
    const guardado = await guardarLogo({ imagen: imagenNueva ?? undefined, escala: escalaVisible });

    // Si falla, se sigue editando: el borrador sigue ahí para reintentar y la
    // banda conserva lo de antes
    if (guardado) {
      limpiarBorrador();
      setEditando(false);
      setGuardadoConfirmado(true);
    }
  }

  function confirmarQuitar() {
    confirmar({
      titulo: "¿Quitar el logo?",
      mensaje: `«${nombreBanda}» se quedará sin logo.`,
      textoCancelar: "Cancelar",
      textoConfirmar: "Quitar",
      destructivo: true,
      onConfirmar: () => {
        setGuardadoConfirmado(false);
        void quitarLogo();
      },
    });
  }

  // Cancelar (y Atrás) en edición: sin cambios vuelve a consultar; con cambios, pregunta
  function cancelarEdicion() {
    if (!hayCambios) {
      salirDeEdicion();
      return;
    }

    confirmar({
      titulo: "Tienes cambios sin guardar.",
      mensaje: "Si descartas, el logo se queda como estaba.",
      textoCancelar: "Seguir editando",
      textoConfirmar: "Descartar",
      destructivo: true,
      onConfirmar: salirDeEdicion,
    });
  }

  // Consultando, Atrás vuelve a Banda; editando, es Cancelar. Mientras guarda, nada
  useAtrasAndroid(enFoco ? (procesando ? () => {} : editando ? cancelarEdicion : onVolver) : null);

  const puedeReducir = escalaVisible > ESCALA_LOGO.minima;
  const puedeAumentar = escalaVisible < ESCALA_LOGO.maxima;

  return (
    <PantallaInterior>
      <BotonCerrarSesion />
      <CabeceraPantalla titulo="Logo de la banda" subtitulo={nombreBanda} />
      {!editando && <BotonSecundario titulo="Volver a Banda" onPress={onVolver} disabled={procesando} />}

      <View style={estilos.vista}>
        {guardadoConfirmado && <Mensaje tipo="exito" texto="✓ Logo guardado correctamente" />}

        {/* Vista previa: igual que se verá en el Calendario */}
        <View style={estilos.marco}>
          {uriVisible !== null ? (
            <LogoBanda url={uriVisible} nombreBanda={nombreBanda} escala={escalaVisible} />
          ) : (
            <View style={estilos.hueco}>
              <Text style={estilos.textoHueco}>Sin logo</Text>
            </View>
          )}
        </View>

        {editando ? (
          <>
            {uriVisible !== null && (
              <View
                style={estilos.filaEscala}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Tamaño del logo"
                accessibilityValue={{ text: porcentajeEscalaLogo(escalaVisible) }}
                accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === "increment") {
                    setEscalaBorrador(aumentarEscalaLogo(escalaVisible));
                  } else if (nativeEvent.actionName === "decrement") {
                    setEscalaBorrador(reducirEscalaLogo(escalaVisible));
                  }
                }}
              >
                <Text style={estilos.etiquetaEscala}>Tamaño</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reducir tamaño"
                  accessibilityState={{ disabled: !puedeReducir || procesando }}
                  disabled={!puedeReducir || procesando}
                  onPress={() => setEscalaBorrador(reducirEscalaLogo(escalaVisible))}
                  style={({ pressed }) => [
                    estilos.botonEscala,
                    pressed && estilos.botonEscalaPulsado,
                    (!puedeReducir || procesando) && estilos.botonEscalaDeshabilitado,
                  ]}
                >
                  <Text style={estilos.textoBotonEscala}>−</Text>
                </Pressable>
                <Text style={estilos.valorEscala}>{porcentajeEscalaLogo(escalaVisible)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar tamaño"
                  accessibilityState={{ disabled: !puedeAumentar || procesando }}
                  disabled={!puedeAumentar || procesando}
                  onPress={() => setEscalaBorrador(aumentarEscalaLogo(escalaVisible))}
                  style={({ pressed }) => [
                    estilos.botonEscala,
                    pressed && estilos.botonEscalaPulsado,
                    (!puedeAumentar || procesando) && estilos.botonEscalaDeshabilitado,
                  ]}
                >
                  <Text style={estilos.textoBotonEscala}>+</Text>
                </Pressable>
              </View>
            )}

            <Text style={estilos.ayuda}>
              Aparece arriba en el Calendario, a todo el ancho y para toda la banda. PNG (también
              con fondo transparente), JPG o WebP de hasta 2 MB. El tamaño no modifica la imagen.
            </Text>

            {errorOperacion !== "" && <Mensaje tipo="error" texto={errorOperacion} />}

            <View style={estilos.acciones}>
              <BotonSecundario
                titulo={uriVisible === null ? "Elegir imagen" : "Elegir otra imagen"}
                onPress={() => void elegirImagen()}
                disabled={procesando}
              />
              <BotonPrincipal
                titulo={procesando ? "Guardando..." : "Guardar"}
                onPress={() => void guardar()}
                disabled={procesando || !hayCambios}
              />
              <BotonSecundario titulo="Cancelar" onPress={cancelarEdicion} disabled={procesando} />
            </View>
          </>
        ) : (
          <>
            {/* Consulta: solo lo guardado, sin controles que cambien nada */}
            {url !== null && (
              <View style={estilos.filaEscala}>
                <Text style={estilos.etiquetaEscala}>Tamaño actual</Text>
                <Text style={estilos.valorEscala}>{porcentajeEscalaLogo(escala)}</Text>
              </View>
            )}

            {errorOperacion !== "" && <Mensaje tipo="error" texto={errorOperacion} />}

            <View style={estilos.acciones}>
              <BotonPrincipal
                titulo={url === null ? "Añadir logo" : "Editar"}
                onPress={entrarEnEdicion}
                disabled={procesando}
              />
              {url !== null && (
                <BotonDestructivo titulo="Quitar logo" onPress={confirmarQuitar} disabled={procesando} />
              )}
            </View>
          </>
        )}
      </View>
    </PantallaInterior>
  );
}

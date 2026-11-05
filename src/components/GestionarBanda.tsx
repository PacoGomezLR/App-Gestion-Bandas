import { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import {
  comprobarConfiguracionInvitaciones,
  crearEnlaceInvitacion,
  ErrorConfiguracionInvitacion,
} from "../lib/invitacion-deep-link";
import { ErrorRepositorio } from "../services/supabase/errores";
import { crearInvitacionBanda } from "../services/supabase/invitaciones";
import type { IntegranteBanda } from "../types/banda";
import type { InvitacionCreada } from "../types/invitacion";
import type { RolUsuario } from "../types/usuario";
import { fechaDeHoy, formatearFechaConBarras } from "../utils/fechas";
import { crearEstilosGestionarBanda } from "./GestionarBanda.styles";
import { AccionSecundaria, BotonPrincipal, Mensaje } from "./PantallaBase";
import { BotonSecundario, Seccion } from "./PantallaInterior";

interface GestionarBandaProps {
  bandaId: string;
  bandaNombre: string;
  integrantes: IntegranteBanda[];
}

// Textos para personas: los valores internos (admin / usuario) no se muestran
const TIPOS_ACCESO: { rol: RolUsuario; etiqueta: string; detalle: string }[] = [
  {
    rol: "usuario",
    etiqueta: "Usuario",
    detalle: "Ve el calendario y marca su disponibilidad.",
  },
  {
    rol: "admin",
    etiqueta: "Administrador",
    detalle: "Además puede crear y editar eventos, gestionar la banda e invitar a otras personas.",
  },
];

function etiquetaAcceso(rol: RolUsuario): string {
  return TIPOS_ACCESO.find((tipo) => tipo.rol === rol)?.etiqueta ?? "";
}

// La caducidad la decide la base; aquí solo se muestra en el formato de la app
function fechaCaducidad(expiraEn: string): string {
  return formatearFechaConBarras(fechaDeHoy(new Date(expiraEn)));
}

type Paso = "cerrado" | "eligiendo" | "preparada";

// Usuarios de la banda actual y su invitación por enlace. Solo para admin: la
// pantalla solo se ofrece a un admin y la base vuelve a comprobarlo al crear.
export function GestionarBanda({ bandaId, bandaNombre, integrantes }: GestionarBandaProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosGestionarBanda(tema), [tema]);
  const [paso, setPaso] = useState<Paso>("cerrado");
  const [rol, setRol] = useState<RolUsuario>("usuario");
  const [invitacion, setInvitacion] = useState<InvitacionCreada | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  function cerrar() {
    setPaso("cerrado");
    setRol("usuario");
    // El token solo vive en memoria mientras se comparte
    setInvitacion(null);
    setError("");
  }

  async function generar() {
    if (procesando) {
      return;
    }

    setProcesando(true);
    setError("");

    try {
      // Con la configuración del enlace rota no se crea una invitación que no se podría compartir
      comprobarConfiguracionInvitaciones();
      setInvitacion(await crearInvitacionBanda(bandaId, rol));
      setPaso("preparada");
    } catch (fallo) {
      if (fallo instanceof ErrorConfiguracionInvitacion) {
        setError(fallo.message);
      } else {
        setError(
          fallo instanceof ErrorRepositorio && fallo.motivo === "sin_permiso"
            ? "Solo un administrador de la banda puede invitar."
            : "No se ha podido crear la invitación."
        );
      }
    } finally {
      setProcesando(false);
    }
  }

  async function compartir(creada: InvitacionCreada) {
    // El enlace con el token va solo al sistema de compartir: no se muestra ni se guarda
    await Share.share({
      message: [
        `Te invito a unirte a ${bandaNombre} en MI Banda.`,
        "Abre este enlace en el móvil con la app instalada:",
        crearEnlaceInvitacion(creada.token),
        `Caduca el ${fechaCaducidad(creada.expiraEn)}.`,
      ].join("\n\n"),
    });
  }

  return (
    <>
      <Seccion titulo="Usuarios">
        <View style={estilos.lista}>
          {integrantes.map(({ usuarioId, nombreVisible }) => (
            <View key={usuarioId} style={estilos.usuario}>
              <Text style={[estilos.nombre, nombreVisible === null && estilos.sinNombre]}>
                {nombreVisible ?? "Integrante sin nombre"}
              </Text>
            </View>
          ))}
        </View>
      </Seccion>

      {paso === "cerrado" && (
        <BotonPrincipal titulo="+ Invitar usuario" onPress={() => setPaso("eligiendo")} />
      )}

      {paso === "eligiendo" && (
        <View style={estilos.tarjeta}>
          <Text accessibilityRole="header" style={estilos.tituloTarjeta}>
            Invitar usuario
          </Text>

          <Text style={estilos.etiqueta}>Tipo de acceso</Text>

          <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de acceso" style={estilos.opciones}>
            {TIPOS_ACCESO.map((tipo) => {
              const elegido = tipo.rol === rol;

              return (
                <Pressable
                    key={tipo.rol}
                    accessibilityRole="radio"
                    accessibilityLabel={tipo.etiqueta}
                    accessibilityState={{ checked: elegido, disabled: procesando }}
                    disabled={procesando}
                    onPress={() => setRol(tipo.rol)}
                    style={[estilos.opcion, elegido && estilos.opcionElegida]}
                  >
                    <View style={[estilos.radio, elegido && estilos.radioElegido]} />
                    <View style={estilos.textosOpcion}>
                      <Text style={estilos.textoOpcion}>{tipo.etiqueta}</Text>
                      <Text style={estilos.detalleOpcion}>{tipo.detalle}</Text>
                    </View>
                  </Pressable>
              );
            })}
          </View>

          {error !== "" && <Mensaje tipo="error" texto={error} />}

          <BotonPrincipal
            titulo="Generar invitación"
            onPress={() => void generar()}
            disabled={procesando}
          />
          <BotonSecundario titulo="Cancelar" onPress={cerrar} disabled={procesando} />
        </View>
      )}

      {paso === "preparada" && invitacion !== null && (
        <View style={estilos.tarjeta}>
          <Text accessibilityRole="header" style={estilos.tituloTarjeta}>
            Invitación preparada
          </Text>
          <Text style={estilos.texto}>Tipo de acceso: {etiquetaAcceso(invitacion.rol)}</Text>
          <Text style={estilos.texto}>
            Comparte este enlace con la persona que quieras añadir. Caduca el{" "}
            {fechaCaducidad(invitacion.expiraEn)} y solo puede usarse una vez.
          </Text>

          <BotonPrincipal titulo="Compartir invitación" onPress={() => void compartir(invitacion)} />
          <AccionSecundaria pregunta="¿Ya la has enviado?" titulo="Cerrar" onPress={cerrar} />
        </View>
      )}
    </>
  );
}

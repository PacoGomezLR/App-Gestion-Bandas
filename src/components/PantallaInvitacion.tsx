import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useBandaContext } from "../context/BandaContext";
import { useInvitacionPendiente } from "../context/InvitacionPendienteContext";
import {
  aceptarInvitacionBanda,
  consultarInvitacionBanda,
} from "../services/supabase/invitaciones";
import type { ConsultaInvitacion, ResultadoAceptacion } from "../types/invitacion";
import { AccionSecundaria, BotonPrincipal, Mensaje, PantallaBase } from "./PantallaBase";
import { crearEstilosPantallaInvitacion } from "./PantallaInvitacion.styles";

// Mensajes para personas, nunca errores técnicos de la base
const MENSAJES: Record<Exclude<ResultadoAceptacion, "aceptada">, string> = {
  no_valida: "Esta invitación ya no es válida.",
  caducada: "Esta invitación ha caducado. Pide una nueva a quien te invitó.",
  usada: "Esta invitación ya se ha usado.",
  ya_miembro: "Ya perteneces a esta banda.",
};

type Estado =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "consulta"; consulta: ConsultaInvitacion }
  | { tipo: "aceptada"; bandaId: string; bandaNombre: string };

// Se muestra con sesión iniciada mientras haya una invitación pendiente.
// Nunca se une a nadie sin que pulse «Unirme a la banda».
export function PantallaInvitacion() {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPantallaInvitacion(tema), [tema]);
  const { tokenPendiente, descartarInvitacion } = useInvitacionPendiente();
  const { recargarBandas } = useBandaContext();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    let activo = true;

    if (tokenPendiente === null) {
      return;
    }

    setEstado({ tipo: "cargando" });

    consultarInvitacionBanda(tokenPendiente)
      .then((consulta) => {
        if (activo) {
          setEstado({ tipo: "consulta", consulta });
        }
      })
      .catch(() => {
        if (activo) {
          setEstado({ tipo: "error", mensaje: "No se ha podido comprobar la invitación." });
        }
      });

    return () => {
      activo = false;
    };
  }, [tokenPendiente]);

  async function unirme() {
    if (tokenPendiente === null || procesando) {
      return;
    }

    setProcesando(true);

    try {
      // Sin rol: la base usa el que eligió el admin al invitar
      const { resultado, bandaId, bandaNombre } = await aceptarInvitacionBanda(tokenPendiente);

      if (resultado === "aceptada" && bandaId !== null) {
        setEstado({ tipo: "aceptada", bandaId, bandaNombre: bandaNombre ?? "la banda" });
      } else if (resultado !== "aceptada") {
        setEstado({ tipo: "consulta", consulta: { estado: resultado, bandaNombre } });
      }
    } catch {
      setEstado({ tipo: "error", mensaje: "No se ha podido aceptar la invitación." });
    } finally {
      setProcesando(false);
    }
  }

  async function entrarEnLaBanda(bandaId: string) {
    setProcesando(true);

    try {
      // Recarga las bandas y abre la nueva sin reiniciar la app
      await recargarBandas(bandaId);
    } finally {
      setProcesando(false);
      descartarInvitacion();
    }
  }

  if (estado.tipo === "cargando") {
    return (
      <PantallaBase subtitulo="Invitación a una banda">
        <View style={estilos.bloque}>
          <ActivityIndicator color={tema.primary} />
          <Text style={estilos.texto}>Comprobando la invitación...</Text>
        </View>
      </PantallaBase>
    );
  }

  if (estado.tipo === "aceptada") {
    return (
      <PantallaBase subtitulo="Invitación a una banda">
        <View style={estilos.bloque}>
          <Text style={estilos.titulo}>Ya formas parte de</Text>
          <Text style={estilos.nombreBanda}>{estado.bandaNombre}</Text>
        </View>
        <BotonPrincipal
          titulo="Entrar en la banda"
          onPress={() => void entrarEnLaBanda(estado.bandaId)}
          disabled={procesando}
        />
      </PantallaBase>
    );
  }

  const estadoConsulta = estado.tipo === "consulta" ? estado.consulta.estado : null;

  if (estado.tipo === "error" || (estadoConsulta !== null && estadoConsulta !== "valida")) {
    const mensaje =
      estado.tipo === "error"
        ? estado.mensaje
        : estadoConsulta === null || estadoConsulta === "valida"
          ? "No se ha podido comprobar la invitación."
          : MENSAJES[estadoConsulta];

    return (
      <PantallaBase subtitulo="Invitación a una banda">
        <Mensaje tipo={estado.tipo === "error" ? "error" : "info"} texto={mensaje} />
        <BotonPrincipal titulo="Continuar" onPress={descartarInvitacion} />
      </PantallaBase>
    );
  }

  return (
    <PantallaBase subtitulo="Invitación a una banda">
      <View style={estilos.bloque}>
        <Text style={estilos.texto}>Te han invitado a unirte a:</Text>
        <Text style={estilos.nombreBanda}>{estado.consulta.bandaNombre}</Text>
      </View>

      <BotonPrincipal
        titulo="Unirme a la banda"
        onPress={() => void unirme()}
        disabled={procesando}
      />

      {/* Rechazar solo cierra esta pantalla: la invitación sigue valiendo hasta usarse o caducar */}
      <AccionSecundaria
        pregunta="¿No quieres unirte?"
        titulo="Rechazar"
        onPress={descartarInvitacion}
        disabled={procesando}
      />
    </PantallaBase>
  );
}

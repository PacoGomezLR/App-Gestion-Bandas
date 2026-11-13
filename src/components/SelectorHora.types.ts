// API común de SelectorHora (nativo) y SelectorHora.web: quien lo usa no
// necesita saber en qué plataforma está
export interface SelectorHoraProps {
  // "" sin hora, o HH:MM
  hora: string;
  // Recibe siempre "" o HH:MM
  onCambiarHora: (hora: string) => void;
  disabled?: boolean;
}

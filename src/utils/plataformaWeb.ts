export type PlataformaWeb = "android" | "ios" | "otra";

interface EntornoNavegador {
  userAgent: string;
  maxTouchPoints: number;
}

// Solo lo necesario para no ofrecer un botón que no funcione: Android, iPhone /
// iPad u otra cosa (escritorio). Sin huellas del dispositivo.
// iPadOS 13+ se presenta como Mac: se reconoce por la pantalla táctil.
export function detectarPlataformaWeb({ userAgent, maxTouchPoints }: EntornoNavegador): PlataformaWeb {
  if (/Android/i.test(userAgent)) {
    return "android";
  }

  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) {
    return "ios";
  }

  return "otra";
}

// En el navegador; fuera de él (export estático, Node) no hay plataforma
export function plataformaDelNavegador(): PlataformaWeb {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return "otra";
  }

  return detectarPlataformaWeb({
    userAgent: navigator.userAgent,
    maxTouchPoints: typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0,
  });
}

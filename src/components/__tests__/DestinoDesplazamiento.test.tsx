import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Keyboard, Text, TextInput } from "react-native";

import { BottomTabInset } from "@/constants/theme";
import { useDesplazamiento } from "@/hooks/useDesplazamiento";
import { DestinoDesplazamiento } from "../DestinoDesplazamiento";
import { PantallaInterior } from "../PantallaInterior";

// PantallaInterior y los destinos son los reales; se simula solo la plataforma
// (medir, desplazar, enfocar): se comprueba la intención, no coordenadas reales.

jest.mock("../../global.css", () => ({}));

// Zona: de 0 a 800. Cada medición pide primero la zona y luego el objetivo
let mockObjetivo = { arriba: 1500, alto: 48 };
let mockMediciones = 0;
const mockDesplazarA = jest.fn();

jest.mock("@/hooks/plataformaDesplazamiento", () => ({
  medirEnVentana: () => {
    mockMediciones += 1;
    return Promise.resolve(mockMediciones % 2 === 1 ? { arriba: 0, alto: 800 } : mockObjetivo);
  },
  altoVentana: () => 800,
  desplazarA: (_scroll: unknown, y: number) => mockDesplazarA(y),
  enfocarCampo: jest.fn(),
}));

// Lo que tarda en pintarse un fotograma (requestAnimationFrame) y en resolverse las medidas
async function esperarFotograma() {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
  });
}

let llevarA: ReturnType<typeof useDesplazamiento>["llevarA"] = () => {};

function Pantalla({ enfocar }: { enfocar?: () => void }) {
  const desplazamiento = useDesplazamiento();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  llevarA = desplazamiento.llevarA;

  return (
    <PantallaInterior desplazamiento={desplazamiento}>
      <Text onPress={() => setAbierto(true)}>Abrir</Text>
      {abierto && (
        <DestinoDesplazamiento clave="siguiente" enfocar={enfocar}>
          <TextInput accessibilityLabel="Campo" value={texto} onChangeText={setTexto} />
        </DestinoDesplazamiento>
      )}
    </PantallaInterior>
  );
}

const destino = () => screen.getByTestId("destino-siguiente");

beforeEach(() => {
  jest.clearAllMocks();
  mockObjetivo = { arriba: 1500, alto: 48 };
  mockMediciones = 0;
});

test("espera a que el destino exista: se centra cuando aparece, sin esperas arbitrarias", async () => {
  await render(<Pantalla />);

  // Se pide antes de que el destino exista (como al tocar un día)
  await act(async () => llevarA("siguiente"));
  await fireEvent.press(screen.getByText("Abrir"));
  await esperarFotograma();

  expect(mockDesplazarA).not.toHaveBeenCalled();

  // Aparece y se coloca: entonces se mide y se desplaza
  await fireEvent(destino(), "layout", { nativeEvent: { layout: { x: 0, y: 900, width: 300, height: 48 } } });
  await esperarFotograma();

  expect(mockDesplazarA).toHaveBeenCalledTimes(1);
  // Su centro (1524) al centro de lo visible: de 0 hasta encima de la barra inferior
  expect(mockDesplazarA).toHaveBeenCalledWith(1524 - (800 - BottomTabInset) / 2);
});

test("si ya existe, basta un fotograma", async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByText("Abrir"));
  await fireEvent(destino(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 48 } } });

  await act(async () => llevarA("siguiente"));
  await esperarFotograma();

  expect(mockDesplazarA).toHaveBeenCalledTimes(1);
});

test("si ya se ve cómodamente, no se desplaza", async () => {
  mockObjetivo = { arriba: 300, alto: 48 };
  await render(<Pantalla />);
  await fireEvent.press(screen.getByText("Abrir"));

  await act(async () => llevarA("siguiente"));
  await esperarFotograma();

  expect(mockDesplazarA).not.toHaveBeenCalled();
});

test("nada se mueve sin pedirlo: ni al pintar, ni al recolocar, ni al escribir", async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByText("Abrir"));
  await fireEvent(destino(), "layout", { nativeEvent: { layout: { x: 0, y: 900, width: 300, height: 48 } } });
  await fireEvent.changeText(screen.getByLabelText("Campo"), "Montilla");
  await fireEvent(destino(), "layout", { nativeEvent: { layout: { x: 0, y: 950, width: 300, height: 60 } } });
  await esperarFotograma();

  expect(mockDesplazarA).not.toHaveBeenCalled();
});

test("una petición, un desplazamiento: un nuevo layout no vuelve a mover la pantalla", async () => {
  await render(<Pantalla />);
  await fireEvent.press(screen.getByText("Abrir"));

  await act(async () => llevarA("siguiente"));
  await esperarFotograma();
  await fireEvent(destino(), "layout", { nativeEvent: { layout: { x: 0, y: 900, width: 300, height: 60 } } });
  await esperarFotograma();

  expect(mockDesplazarA).toHaveBeenCalledTimes(1);
});

test("con enfocar, enfoca el campo; sin pedirlo, no", async () => {
  const enfocar = jest.fn();
  await render(<Pantalla enfocar={enfocar} />);
  await fireEvent.press(screen.getByText("Abrir"));

  await act(async () => llevarA("siguiente"));
  await esperarFotograma();
  expect(enfocar).not.toHaveBeenCalled();

  await act(async () => llevarA("siguiente", { enfocar: true }));
  await esperarFotograma();
  expect(enfocar).toHaveBeenCalledTimes(1);
});

test("al salir el teclado tras enfocar, se recoloca una vez si lo tapa (y solo entonces)", async () => {
  const oyentes: Record<string, (evento: { endCoordinates: { height: number } }) => void> = {};
  jest.spyOn(Keyboard, "addListener").mockImplementation((evento, oyente) => {
    oyentes[evento] = oyente as (evento: { endCoordinates: { height: number } }) => void;
    return { remove: () => {} } as ReturnType<typeof Keyboard.addListener>;
  });
  // Visible sin teclado (520 de 720), tapado con un teclado de 350
  mockObjetivo = { arriba: 520, alto: 48 };
  await render(<Pantalla enfocar={jest.fn()} />);
  await fireEvent.press(screen.getByText("Abrir"));

  await act(async () => llevarA("siguiente", { enfocar: true }));
  await esperarFotograma();
  expect(mockDesplazarA).not.toHaveBeenCalled();

  await act(async () => {
    oyentes.keyboardDidShow({ endCoordinates: { height: 350 } });
  });
  await esperarFotograma();
  expect(mockDesplazarA).toHaveBeenCalledTimes(1);

  // Otro teclado (por ejemplo, al cambiar de campo a mano) no mueve nada
  await act(async () => {
    oyentes.keyboardDidShow({ endCoordinates: { height: 350 } });
  });
  await esperarFotograma();
  expect(mockDesplazarA).toHaveBeenCalledTimes(1);
});

test("un destino que desaparece se olvida: pedirlo no hace nada", async () => {
  const { rerender } = await render(<Pantalla />);
  await fireEvent.press(screen.getByText("Abrir"));
  await rerender(<Text>Otra pantalla</Text>);

  await act(async () => llevarA("siguiente"));
  await esperarFotograma();

  expect(mockDesplazarA).not.toHaveBeenCalled();
});

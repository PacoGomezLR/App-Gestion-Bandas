import { render } from "@testing-library/react-native";
import type { Tecnico } from "../../types/tecnico";
import { ListaTecnicos } from "../ListaTecnicos";

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

describe("ListaTecnicos", () => {
  test("muestra los técnicos recibidos", async () => {
    const { getByText } = await render(
      <ListaTecnicos tecnicos={tecnicos} />
    );

    expect(getByText("Carlos")).toBeTruthy();
    expect(getByText("Miguel")).toBeTruthy();
  });
});

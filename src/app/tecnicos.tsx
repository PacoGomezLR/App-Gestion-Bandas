import { ScrollView, Text } from "react-native";

import { ListaTecnicos } from "../components/ListaTecnicos";
import { tecnicosIniciales } from "../data/tecnicosIniciales";

export default function TecnicosScreen() {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
      }}
    >
      <Text>Técnicos</Text>

      <ListaTecnicos tecnicos={tecnicosIniciales} />
    </ScrollView>
  );
}

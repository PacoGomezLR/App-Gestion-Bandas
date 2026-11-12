import { extensionDeLogo, mimeDeLogo } from "../formatoLogo";

describe("mimeDeLogo", () => {
  test.each([
    ["image/png", "image/png"],
    ["image/jpeg", "image/jpeg"],
    ["image/webp", "image/webp"],
    // Algunos sistemas dicen image/jpg: es el mismo JPEG
    ["image/jpg", "image/jpeg"],
    ["IMAGE/PNG", "image/png"],
  ])("usa el MIME real del sistema: %s → %s", (mimeType, esperado) => {
    expect(mimeDeLogo({ uri: "file:///cache/x", mimeType })).toBe(esperado);
  });

  test("un PNG sigue siendo PNG aunque su nombre diga otra cosa: manda el MIME", () => {
    expect(mimeDeLogo({ uri: "file:///cache/logo.jpg", mimeType: "image/png", fileName: "logo.jpg" })).toBe(
      "image/png"
    );
  });

  test.each([
    [{ uri: "file:///cache/a.png" }, "image/png"],
    [{ uri: "file:///cache/a", fileName: "Logo.PNG" }, "image/png"],
    [{ uri: "file:///cache/a.jpeg" }, "image/jpeg"],
    [{ uri: "file:///cache/a.jpg?v=1" }, "image/jpeg"],
    [{ uri: "file:///cache/a.webp", mimeType: null }, "image/webp"],
  ])("sin MIME, por la extensión: %p → %s", (imagen, esperado) => {
    expect(mimeDeLogo(imagen)).toBe(esperado);
  });

  test.each([
    { uri: "file:///cache/a.heic", mimeType: "image/heic" },
    { uri: "file:///cache/a.gif", mimeType: "image/gif" },
    { uri: "file:///cache/a.gif" },
    { uri: "file:///cache/sin-extension" },
  ])("formatos que el bucket no admite: null (%p)", (imagen) => {
    expect(mimeDeLogo(imagen)).toBeNull();
  });
});

test.each([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
] as const)("extensión coherente con el MIME: %s → .%s", (mime, extension) => {
  expect(extensionDeLogo(mime)).toBe(extension);
});

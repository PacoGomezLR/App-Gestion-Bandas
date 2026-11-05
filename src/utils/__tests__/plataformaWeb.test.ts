import { detectarPlataformaWeb } from "../plataformaWeb";

// User agents reales de cada familia de navegador
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPHONE_WHATSAPP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPAD_ESCRITORIO =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

describe("detectarPlataformaWeb", () => {
  test("Android", () => {
    expect(detectarPlataformaWeb({ userAgent: ANDROID_CHROME, maxTouchPoints: 5 })).toBe("android");
  });

  test("iPhone en Safari y en el navegador de WhatsApp", () => {
    expect(detectarPlataformaWeb({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5 })).toBe("ios");
    expect(detectarPlataformaWeb({ userAgent: IPHONE_WHATSAPP, maxTouchPoints: 5 })).toBe("ios");
  });

  test("iPad que se presenta como Mac (pantalla táctil)", () => {
    expect(detectarPlataformaWeb({ userAgent: IPAD_ESCRITORIO, maxTouchPoints: 5 })).toBe("ios");
  });

  test("escritorio: Mac sin pantalla táctil y Windows", () => {
    expect(detectarPlataformaWeb({ userAgent: IPAD_ESCRITORIO, maxTouchPoints: 0 })).toBe("otra");
    expect(detectarPlataformaWeb({ userAgent: WINDOWS_CHROME, maxTouchPoints: 0 })).toBe("otra");
    expect(detectarPlataformaWeb({ userAgent: "", maxTouchPoints: 0 })).toBe("otra");
  });
});

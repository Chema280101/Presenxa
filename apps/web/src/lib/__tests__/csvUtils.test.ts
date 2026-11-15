import { describe, it, expect } from "vitest";
import { escapeCsvCell, parseCsvRFC4180, toCsvRow } from "../csvUtils";

describe("csvUtils", () => {
  it("neutraliza CSV Formula Injection para =, +, -, @, tab y CR", () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe(`"'=CMD|' /C calc'!A0"`);
    expect(escapeCsvCell("+51987654321")).toBe(`"'+51987654321"`);
    expect(escapeCsvCell("-1+1")).toBe(`"'-1+1"`);
    expect(escapeCsvCell("@SUM(1+1)")).toBe(`"'@SUM(1+1)"`);
    expect(escapeCsvCell("  =HYPERLINK()")).toBe(`"'  =HYPERLINK()"`);
  });

  it("escapa comillas dobles internas según RFC 4180", () => {
    expect(escapeCsvCell('Sede "Central"')).toBe(`"Sede ""Central"""`);
    expect(toCsvRow(["72819201", 'Pérez, "Juan"', null])).toBe(
      `"72819201";"Pérez, ""Juan""";""`
    );
  });

  it("parsea CSV con BOM UTF-8, delimitadores y comillas dentro de campos", () => {
    const csv = `\uFEFFNombres;Apellidos;Correo\r\n"Juan; Carlos";"Pérez, ""El Grande""";juan@empresa.com\r\nMaría;Gómez;maria@empresa.com`;
    const rows = parseCsvRFC4180(csv);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(["Nombres", "Apellidos", "Correo"]);
    expect(rows[1]).toEqual(["Juan; Carlos", 'Pérez, "El Grande"', "juan@empresa.com"]);
    expect(rows[2]).toEqual(["María", "Gómez", "maria@empresa.com"]);
  });

  it("detecta delimitador ';' aunque la primera línea de metadatos no tenga ';'", () => {
    const csv = `"PADRÓN OFICIAL"\r\n""\r\nNombres;Apellidos;Correo\r\nAna;López;ana@empresa.com`;
    const rows = parseCsvRFC4180(csv);

    expect(rows[2]).toEqual(["Nombres", "Apellidos", "Correo"]);
    expect(rows[3]).toEqual(["Ana", "López", "ana@empresa.com"]);
  });
});

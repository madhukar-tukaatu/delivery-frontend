"use client";

/**
 * Minimal Code 128 (set B) barcode as inline SVG, for TR bag labels.
 * Encodes printable ASCII (32-126), e.g. "TR-000001". No dependency.
 */
const CODES = ["11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000","11001000100","11000100100","10110011100","10011011100","10011001110","10111001100","10011101100","10011100110","11001110010","11001011100","11001001110","11011100100","11001110100","11101101110","11101001100","11100101100","11100100110","11101100100","11100110100","11100110010","11011011000","11011000110","11000110110","10100011000","10001011000","10001000110","10110001000","10001101000","10001100010","11010001000","11000101000","11000100010","10110111000","10110001110","10001101110","10111011000","10111000110","10001110110","11101110110","11010001110","11000101110","11011101000","11011100010","11011101110","11101011000","11101000110","11100010110","11101101000","11101100010","11100011010","11101111010","11001000010","11110001010","10100110000","10100001100","10010110000","10010000110","10000101100","10000100110","10110010000","10110000100","10011010000","10011000010","10000110100","10000110010","11000010010","11001010000","11110111010","11000010100","10001111010","10100111100","10010111100","10010011110","10111100100","10011110100","10011110010","11110100100","11110010100","11110010010","11011011110","11011110110","11110110110","10101111000","10100011110","10001011110","10111101000","10111100010","11110101000","11110100010","10111011110","10111101110","11101011110","11110101110","11010000100","11010010000","11010011100"];
const STOP = "1100011101011"; // stop pattern + final 2-module bar

export function code128Bits(text) {
  const value = String(text ?? "");
  const vals = [104]; // START B
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) continue;
    vals.push(c - 32);
  }
  let sum = vals[0];
  for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
  vals.push(sum % 103);
  return vals.map((v) => CODES[v]).join("") + STOP;
}

export default function Code128({ value, height = 60, moduleWidth = 2, showText = true, fontSize = 14 }) {
  const bits = code128Bits(value);
  const quiet = 10 * moduleWidth;
  const width = bits.length * moduleWidth + quiet * 2;
  const bars = [];
  let x = 0;
  while (x < bits.length) {
    if (bits[x] === "1") {
      let w = 1;
      while (bits[x + w] === "1") w++;
      bars.push(<rect key={x} x={quiet + x * moduleWidth} y={0} width={w * moduleWidth} height={height} fill="#000" />);
      x += w;
    } else {
      x++;
    }
  }
  const textH = showText ? fontSize + 4 : 0;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height + textH}
      viewBox={`0 0 ${width} ${height + textH}`}
      role="img"
      aria-label={String(value ?? "")}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <rect x={0} y={0} width={width} height={height + textH} fill="#fff" />
      {bars}
      {showText ? (
        <text x={width / 2} y={height + fontSize} textAnchor="middle" fontFamily="monospace" fontSize={fontSize}>
          {value}
        </text>
      ) : null}
    </svg>
  );
}

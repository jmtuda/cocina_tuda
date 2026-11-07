import { ImageResponse } from "next/og";

export function GET(request: Request) {
  const size =
    new URL(request.url).searchParams.get("size") === "512" ? 512 : 192;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#b84b2c",
      }}
    >
      <svg
        width={size * 0.64}
        height={size * 0.64}
        viewBox="0 0 256 256"
        fill="none"
      >
        <path
          d="M60 108h136v70c0 20-16 36-36 36H96c-20 0-36-16-36-36v-70Z"
          fill="#fffdf8"
        />
        <path
          d="M44 111h168M38 135h22m136 0h22M95 84c-22-22 20-25 0-48m34 48c-22-22 20-25 0-48m34 48c-22-22 20-25 0-48"
          stroke="#fffdf8"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "private, max-age=3600" },
    },
  );
}

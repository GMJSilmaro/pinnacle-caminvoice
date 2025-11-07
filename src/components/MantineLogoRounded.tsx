import { Box } from "@mantine/core";

interface Props {
  size?: number;
  color?: string;
}

export function MantineLogoRounded({ size = 24, color = "blue" }: Props) {
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `var(--mantine-color-${color}-6)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: size * 0.6,
        fontWeight: 700,
      }}
    >
      P
    </Box>
  );
}

import { Link } from "react-router-dom";
import logo from "@/assets/solace-logo.png";

export const Logo = ({
  className = "",
  size = 32,
  withWordmark = true,
  invert = false,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  invert?: boolean;
}) => (
  <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
    <img
      src={logo}
      alt="Solace Menu"
      width={size}
      height={size}
      style={{ width: size, height: size, mixBlendMode: invert ? "screen" : "multiply" }}
      className="object-contain"
    />
    {withWordmark && (
      <span className={`font-display text-2xl leading-none tracking-tight ${invert ? "text-background" : ""}`}>
        Solace Menu
      </span>
    )}
  </Link>
);

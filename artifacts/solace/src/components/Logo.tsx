import { Link } from "react-router-dom";
import brandMark from "@/assets/solace-brand-mark.png";
import brandWordmark from "@/assets/solace-brand-wordmark.png";

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
}) => {
  // Artwork is dark on transparent; invert flips it to light for dark surfaces.
  const filter = invert ? "brightness(0) invert(1)" : undefined;
  return (
    <Link to="/" aria-label="Solace Menu" className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <img
        src={brandMark}
        alt={withWordmark ? "" : "Solace Menu"}
        style={{ height: size, width: "auto", filter }}
        className="object-contain dark:[filter:brightness(0)_invert(1)]"
      />
      {withWordmark && (
        <img
          src={brandWordmark}
          alt="Solace Menu"
          style={{ height: Math.max(10, Math.round(size * 0.35)), width: "auto", filter }}
          className="object-contain max-w-[108px] sm:max-w-none dark:[filter:brightness(0)_invert(1)]"
        />
      )}
    </Link>
  );
};

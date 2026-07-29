import Image from "next/image";

/**
 * De profielfoto. Zonder foto tonen we de eerste letter van de naam op een
 * warme achtergrond — dat oogt rustiger dan een leeg poppetje, en je herkent
 * je eigen profiel er meteen aan.
 */
export function Avatar({
  name,
  src,
  className = "size-20",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-sunken ${className}`}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="160px" className="object-cover" unoptimized />
      ) : (
        <span className="cover-terracotta flex size-full items-center justify-center text-[42%] font-semibold text-white">
          {letter}
        </span>
      )}
    </span>
  );
}

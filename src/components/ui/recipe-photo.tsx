import { Photo } from "@/__generated__/graphql";
import Image from "next/image";

interface Props {
  alt: string;
  photo?: Pick<Photo, "url" | "focus">;
  src?: string;
  focus?: Photo["focus"];
}

// todo: figure out what those sizes/breakpoints should be. Next rounds up, so
//  they don't have to be perfect, but should eventually be reasonable.

export default function RecipePhoto({ alt, src, focus, photo }: Props) {
  if (photo) {
    src = photo.url;
    focus = photo.focus;
  }

  if (!focus) focus = [0.5, 0.5];
  else while (focus.length < 2) focus.push(0.5);

  return (
    <Image
      src={src ?? "/recipe-box.jpg"}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
      objectFit="cover"
      objectPosition={`${100 * focus[0]}% ${100 * focus[1]}%`}
    />
  );
}

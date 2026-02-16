import { Photo } from "@/__generated__/graphql";
import Image, { ImageProps } from "next/image";

interface Props extends Omit<ImageProps, "src"> {
  photo?: Pick<Photo, "url" | "focus">;
  focus?: Photo["focus"];
}

// todo: figure out what those sizes/breakpoints should be. Next rounds up, so
//  they don't have to be perfect, but should eventually be reasonable.

export function RecipePhoto({
  alt,
  focus,
  photo,
  className,
  style = {},
  ...passthrough
}: Props) {
  let src = "/recipe-box.jpg";
  if (photo) {
    src = photo.url;
    focus = photo.focus;
  }

  if (!focus) focus = [0.5, 0.5];
  else while (focus.length < 2) focus.push(0.5);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
      className={"object-cover " + className}
      style={{
        objectPosition: `${100 * focus[0]}% ${100 * focus[1]}%`,
        ...style,
      }}
      {...passthrough}
    />
  );
}

/** @deprecated */
export default RecipePhoto;

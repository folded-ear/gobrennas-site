import * as React from "react";

import { RecipeCardStyles } from "@/components/ui/recipe-card/styles";
import { VariantProps } from "class-variance-authority";

const { card, content, description, footer, header, title } =
  RecipeCardStyles();

export type RecipeCardProps = React.ComponentProps<"div"> &
  VariantProps<typeof RecipeCardStyles>;

export function RecipeCard({ className, size, ...props }: RecipeCardProps) {
  return <div className={card({ size, className })} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="header" className={header({ className })} {...props} />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="title" className={title({ className })} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="description"
      className={description({ className })}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="content" className={content({ className })} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="footer" className={footer({ className })} {...props} />
  );
}

RecipeCard.Content = CardContent;
RecipeCard.Description = CardDescription;
RecipeCard.Footer = CardFooter;
RecipeCard.Header = CardHeader;
RecipeCard.Title = CardTitle;

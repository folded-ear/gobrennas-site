import { Card, CardBody, CardHeader, CardProps } from "@heroui/react";
import * as React from "react";

import { RecipeCardStyles } from "@/components/ui/recipe-card/styles";
import { VariantProps } from "class-variance-authority";

const { card, content, description, footer, header, title } =
  RecipeCardStyles();

export type RecipeCardProps = CardProps & VariantProps<typeof RecipeCardStyles>;

export function RecipeCard({ className, ...props }: RecipeCardProps) {
  return <Card className={card({ className })} {...props} />;
}

function Header({ className, ...props }: React.ComponentProps<"div">) {
  return <CardHeader className={header({ className })} {...props} />;
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

function Content({ className, ...props }: React.ComponentProps<"div">) {
  return <CardBody className={content({ className })} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="footer" className={footer({ className })} {...props} />
  );
}

RecipeCard.Content = Content;
RecipeCard.Description = CardDescription;
RecipeCard.Footer = CardFooter;
RecipeCard.Header = Header;
RecipeCard.Title = CardTitle;
